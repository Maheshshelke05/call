package com.employeecalling.telephony

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioManager
import android.net.Uri
import android.os.Bundle
import android.telecom.TelecomManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class RivoTelephonyBridgeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), CallStateListener {

    private val simManager = SimManager(reactContext)
    private val recordingManager = RecordingManager(reactContext)
    private val callStateManager = CallStateManager()
    private val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private val telecomManager = reactContext.getSystemService(Context.TELECOM_SERVICE) as TelecomManager

    private var activeClientCallId: String? = null

    init {
        callStateManager.setListener(this)
    }

    override fun getName(): String = "RivoTelephonyBridge"

    private fun sendEvent(eventName: String, params: WritableMap) {
        if (reactContext.hasActiveCatalystInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        }
    }

    @ReactMethod
    fun getSimAccounts(promise: Promise) {
        try {
            val accounts = simManager.getActiveSimAccounts()
            val array = Arguments.createArray()

            for (acc in accounts) {
                val map = Arguments.createMap()
                map.putInt("slotIndex", acc.slotIndex)
                map.putInt("subscriptionId", acc.subscriptionId)
                map.putString("carrierName", acc.carrierName)
                map.putString("displayName", acc.displayName)
                map.putString("iccId", acc.iccId ?: "")
                map.putBoolean("isDefaultVoice", acc.isDefaultVoice)
                map.putString("phoneAccountHandleId", acc.phoneAccountHandleId ?: "")
                array.pushMap(map)
            }
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("SIM_FETCH_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun initiateCall(phoneNumber: String, simSlot: Int, clientCallId: String, promise: Promise) {
        activeClientCallId = clientCallId

        if (ContextCompat.checkSelfPermission(reactContext, Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
            promise.reject("PERMISSION_DENIED", "CALL_PHONE permission is required to initiate cellular calls")
            return
        }

        try {
            val cleanNumber = phoneNumber.trim().replace(" ", "")
            val uri = Uri.parse("tel:$cleanNumber")
            val extras = Bundle()

            val accountHandle = simManager.getPhoneAccountForSlot(simSlot)
            if (accountHandle != null) {
                extras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, accountHandle)
            }

            try {
                telecomManager.placeCall(uri, extras)
                promise.resolve(true)
            } catch (e: Exception) {
                // Fallback to ACTION_CALL intent
                val intent = Intent(Intent.ACTION_CALL, uri).apply {
                    putExtras(extras)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactContext.startActivity(intent)
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("CALL_INITIATE_FAILED", "Failed to initiate cellular call: ${e.message}", e)
        }
    }

    @ReactMethod
    fun endCall(promise: Promise) {
        try {
            callStateManager.disconnect()
            try {
                if (telecomManager.isInCall) {
                    telecomManager.endCall()
                }
            } catch (_: Exception) {}
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("END_CALL_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun setMuted(muted: Boolean, promise: Promise) {
        try {
            audioManager.isMicrophoneMute = muted
            promise.resolve(muted)
        } catch (e: Exception) {
            promise.reject("MUTE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setSpeakerphone(speakerOn: Boolean, promise: Promise) {
        try {
            audioManager.isSpeakerphoneOn = speakerOn
            promise.resolve(speakerOn)
        } catch (e: Exception) {
            promise.reject("SPEAKER_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun checkRecordingCapability(promise: Promise) {
        val status = recordingManager.checkCapability()
        promise.resolve(status.name)
    }

    @ReactMethod
    fun startCallRecording(callId: String, phoneNumber: String, promise: Promise) {
        val success = recordingManager.startRecording(callId, phoneNumber)
        promise.resolve(success)
    }

    @ReactMethod
    fun stopCallRecording(promise: Promise) {
        val result = recordingManager.stopRecording()
        if (result != null) {
            val map = Arguments.createMap()
            map.putString("filePath", result.filePath)
            map.putDouble("durationSeconds", result.durationSeconds.toDouble())
            map.putDouble("fileSizeBytes", result.fileSizeBytes.toDouble())
            map.putString("mimeType", result.mimeType)
            map.putString("recordingMethod", result.recordingMethod)
            promise.resolve(map)
        } else {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun openOemBackgroundSettings(promise: Promise) {
        val opened = OemPermissionHelper.openOemBackgroundSettings(reactContext)
        promise.resolve(opened)
    }

    // CallStateListener implementation
    override fun onCallStateChanged(state: CallPlatformState, durationSeconds: Long, disconnectReason: String?) {
        val map = Arguments.createMap()
        map.putString("state", state.name)
        map.putDouble("durationSeconds", durationSeconds.toDouble())
        map.putString("disconnectReason", disconnectReason ?: "")
        map.putString("clientCallId", activeClientCallId ?: "")
        sendEvent("onCallStateChanged", map)
    }

    override fun onCallEnded(totalDurationSeconds: Long, talkDurationSeconds: Long, disconnectCause: String) {
        val map = Arguments.createMap()
        map.putDouble("totalDurationSeconds", totalDurationSeconds.toDouble())
        map.putDouble("talkDurationSeconds", talkDurationSeconds.toDouble())
        map.putString("disconnectCause", disconnectCause)
        map.putString("clientCallId", activeClientCallId ?: "")
        sendEvent("onCallEnded", map)
    }
}
