package com.employeecalling.poc

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.telecom.Call
import android.telecom.TelecomManager
import android.widget.Button
import android.widget.EditText
import android.widget.RadioGroup
import android.widget.TextView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.employeecalling.telephony.*
import java.io.File

/**
 * Phase Zero Standalone Telephony Proof of Concept (POC)
 * Validates:
 * 1. Outgoing cellular call placement via TelecomManager
 * 2. Explicit SIM 1 vs SIM 2 selection via PhoneAccountHandle
 * 3. Real-time call state tracking (DIALING -> RINGING -> ACTIVE -> DISCONNECTED)
 * 4. Call duration and talk-time calculation
 * 5. Disconnect cause mapping
 * 6. Dual-track recording capability (MediaRecorder + OEM sync)
 * 7. Audio file verification & upload readiness
 */
class TelephonyPocActivity : Activity(), CallStateListener {

    private lateinit var simManager: SimManager
    private lateinit var recordingManager: RecordingManager
    private lateinit var callStateManager: CallStateManager

    private lateinit var tvStatus: TextView
    private lateinit var tvLog: TextView
    private lateinit var etPhone: EditText
    private lateinit var btnCallSim1: Button
    private lateinit var btnCallSim2: Button
    private lateinit var btnEndCall: Button
    private lateinit var btnTestRecord: Button

    private var activeCallId = "POC_CALL_001"
    private var isRecording = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        simManager = SimManager(this)
        recordingManager = RecordingManager(this)
        callStateManager = CallStateManager()
        callStateManager.setListener(this)

        checkAndRequestPermissions()
        initUI()
        refreshSimStatus()
    }

    private fun checkAndRequestPermissions() {
        val permissions = arrayOf(
            Manifest.permission.CALL_PHONE,
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.READ_CONTACTS
        )
        val missing = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, missing.toTypedArray(), 1001)
        }
    }

    private fun initUI() {
        // In actual app, layout XML or Jetpack Compose is loaded.
        logMessage("POC Activity Initialized. Checking telephony hardware...")
        val capability = recordingManager.checkCapability()
        logMessage("Recording capability status: $capability")
    }

    private fun refreshSimStatus() {
        val sims = simManager.getActiveSimAccounts()
        logMessage("Active SIM accounts detected: ${sims.size}")
        for (sim in sims) {
            logMessage("SIM Slot ${sim.slotIndex}: Carrier = ${sim.carrierName}, Label = ${sim.displayName}")
        }
    }

    fun makeCall(slotIndex: Int) {
        val phone = etPhone.text.toString().trim()
        if (phone.isEmpty()) {
            logMessage("ERROR: Please enter a target phone number.")
            return
        }

        val account = simManager.getPhoneAccountForSlot(slotIndex)
        if (account == null) {
            logMessage("WARNING: Slot $slotIndex account handle not found, using default voice account.")
        }

        logMessage("Initiating cellular call to $phone using SIM Slot $slotIndex...")
        val telecomManager = getSystemService(Context.TELECOM_SERVICE) as TelecomManager
        val extras = Bundle()
        if (account != null) {
            extras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, account)
        }

        try {
            telecomManager.placeCall(Uri.parse("tel:$phone"), extras)
            logMessage("telecomManager.placeCall() dispatched successfully.")
            
            // Check recording capability and begin if ready
            if (recordingManager.checkCapability() == RecordingCapabilityStatus.READY) {
                val started = recordingManager.startRecording(activeCallId, phone)
                logMessage("Call recording started: $started")
                isRecording = started
            }
        } catch (e: Exception) {
            logMessage("ERROR placing call: ${e.message}")
        }
    }

    fun endCall() {
        callStateManager.disconnect()
        if (isRecording) {
            val rec = recordingManager.stopRecording()
            if (rec != null) {
                logMessage("Recording saved: ${rec.filePath} (${rec.durationSeconds}s, ${rec.fileSizeBytes} bytes)")
            } else {
                logMessage("Recording result: NULL (Not saved or unsupported)")
            }
            isRecording = false
        }
    }

    override fun onCallStateChanged(state: CallPlatformState, durationSeconds: Long, disconnectReason: String?) {
        runOnUiThread {
            logMessage("CALL STATE -> $state | Duration: ${durationSeconds}s | Reason: $disconnectReason")
        }
    }

    override fun onCallEnded(totalDurationSeconds: Long, talkDurationSeconds: Long, disconnectCause: String) {
        runOnUiThread {
            logMessage("CALL TERMINATED | Total: ${totalDurationSeconds}s | Talk: ${talkDurationSeconds}s | Cause: $disconnectCause")
            if (isRecording) {
                val rec = recordingManager.stopRecording()
                logMessage("Post-hangup recording validation: ${rec?.filePath ?: "None"}")
                isRecording = false
            }
        }
    }

    private fun logMessage(msg: String) {
        android.util.Log.i("TelephonyPOC", msg)
    }
}
