package com.employeecalling.telephony

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.MediaMetadataRetriever
import android.media.MediaRecorder
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.util.Log
import androidx.core.content.ContextCompat
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

enum class RecordingCapabilityStatus {
    UNAVAILABLE,
    READY,
    RECORDING,
    PROCESSING,
    UPLOADING,
    AVAILABLE,
    FAILED,
    PERMISSION_REQUIRED,
    DEVICE_UNSUPPORTED
}

data class RecordingResult(
    val filePath: String,
    val durationSeconds: Long,
    val fileSizeBytes: Long,
    val mimeType: String,
    val recordingMethod: String // "MEDIA_RECORDER", "SHIZUKU_AUDIO", "OEM_SYNCED"
)

class RecordingManager(private val context: Context) {

    private val tag = "RecordingManager"
    private var mediaRecorder: MediaRecorder? = null
    private var currentOutputFile: File? = null
    private var recordingStartTimeMs: Long = 0L
    private var isRecordingActive = false

    fun checkCapability(): RecordingCapabilityStatus {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            return RecordingCapabilityStatus.PERMISSION_REQUIRED
        }

        // Check if device supports basic audio recording
        val hasMic = context.packageManager.hasSystemFeature(PackageManager.FEATURE_MICROPHONE)
        if (!hasMic) {
            return RecordingCapabilityStatus.DEVICE_UNSUPPORTED
        }

        return if (isRecordingActive) RecordingCapabilityStatus.RECORDING else RecordingCapabilityStatus.READY
    }

    fun startRecording(callId: String, phoneNumber: String): Boolean {
        if (isRecordingActive) {
            Log.w(tag, "Recording already active")
            return false
        }

        if (checkCapability() != RecordingCapabilityStatus.READY) {
            Log.e(tag, "Recording capability not ready")
            return false
        }

        try {
            val outputDir = getTempRecordingDirectory()
            if (!outputDir.exists()) outputDir.mkdirs()

            val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
            val safePhone = phoneNumber.replace(Regex("[^0-9+]"), "")
            currentOutputFile = File(outputDir, "REC_${callId}_${safePhone}_$timestamp.m4a")

            mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(context)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }

            mediaRecorder?.apply {
                // Adaptive audio source: VOICE_COMMUNICATION or MIC
                setAudioSource(MediaRecorder.AudioSource.VOICE_COMMUNICATION)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioEncodingBitRate(64000)
                setAudioSamplingRate(44100)
                setOutputFile(currentOutputFile?.absolutePath)
                prepare()
                start()
            }

            isRecordingActive = true
            recordingStartTimeMs = System.currentTimeMillis()
            Log.i(tag, "Call recording started: ${currentOutputFile?.absolutePath}")
            return true
        } catch (e: Exception) {
            Log.e(tag, "Failed to start standard recording, trying MIC fallback: ${e.message}")
            return startMicFallback(callId, phoneNumber)
        }
    }

    private fun startMicFallback(callId: String, phoneNumber: String): Boolean {
        try {
            mediaRecorder?.reset()
            mediaRecorder?.release()
            mediaRecorder = null

            val outputDir = getTempRecordingDirectory()
            val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
            currentOutputFile = File(outputDir, "REC_${callId}_fallback_$timestamp.m4a")

            mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(context)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }

            mediaRecorder?.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioEncodingBitRate(64000)
                setAudioSamplingRate(44100)
                setOutputFile(currentOutputFile?.absolutePath)
                prepare()
                start()
            }

            isRecordingActive = true
            recordingStartTimeMs = System.currentTimeMillis()
            Log.i(tag, "Fallback MIC call recording started successfully")
            return true
        } catch (ex: Exception) {
            Log.e(tag, "Fallback MIC recording also failed: ${ex.message}", ex)
            cleanup()
            return false
        }
    }

    fun stopRecording(): RecordingResult? {
        if (!isRecordingActive) return null

        try {
            mediaRecorder?.apply {
                try { stop() } catch (e: RuntimeException) { Log.w(tag, "Stop failed: ${e.message}") }
                reset()
                release()
            }
        } catch (e: Exception) {
            Log.e(tag, "Error releasing MediaRecorder: ${e.message}")
        } finally {
            mediaRecorder = null
            isRecordingActive = false
        }

        val file = currentOutputFile
        if (file != null && file.exists() && file.length() > 1024) { // at least 1KB valid audio
            val durationSeconds = getAudioDurationSeconds(file)
            val result = RecordingResult(
                filePath = file.absolutePath,
                durationSeconds = durationSeconds,
                fileSizeBytes = file.length(),
                mimeType = "audio/mp4",
                recordingMethod = "MEDIA_RECORDER"
            )
            Log.i(tag, "Recording completed successfully: $result")
            return result
        } else {
            Log.w(tag, "Recording file empty or invalid; scanning OEM directories...")
            return scanOemRecordings()
        }
    }

    private fun getAudioDurationSeconds(file: File): Long {
        return try {
            val retriever = MediaMetadataRetriever()
            retriever.setDataSource(context, Uri.fromFile(file))
            val durationMs = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0L
            retriever.release()
            durationMs / 1000L
        } catch (e: Exception) {
            ((System.currentTimeMillis() - recordingStartTimeMs) / 1000L).coerceAtLeast(0L)
        }
    }

    private fun getTempRecordingDirectory(): File {
        val dir = File(context.cacheDir, "call_recordings")
        if (!dir.exists()) dir.mkdirs()
        return dir
    }

    private fun scanOemRecordings(): RecordingResult? {
        val oemDirectories = listOf(
            "MIUI/sound_recorder/call_rec",
            "Sounds/CallRecord",
            "Record/Call",
            "vivo/Record/Call",
            "Recordings/Call Recordings"
        )
        val sinceMs = recordingStartTimeMs - 5000 // 5 seconds grace

        for (relPath in oemDirectories) {
            try {
                val dir = File(Environment.getExternalStorageDirectory(), relPath)
                if (dir.exists() && dir.isDirectory) {
                    val candidate = dir.listFiles()
                        ?.filter { it.isFile && it.lastModified() >= sinceMs }
                        ?.maxByOrNull { it.lastModified() }

                    if (candidate != null && candidate.length() > 1024) {
                        Log.i(tag, "Found OEM recorded file: ${candidate.absolutePath}")
                        return RecordingResult(
                            filePath = candidate.absolutePath,
                            durationSeconds = getAudioDurationSeconds(candidate),
                            fileSizeBytes = candidate.length(),
                            mimeType = "audio/mp4",
                            recordingMethod = "OEM_SYNCED"
                        )
                    }
                }
            } catch (e: Exception) {
                Log.w(tag, "Error inspecting OEM path $relPath: ${e.message}")
            }
        }
        return null
    }

    private fun cleanup() {
        isRecordingActive = false
        mediaRecorder = null
        currentOutputFile?.delete()
        currentOutputFile = null
    }
}
