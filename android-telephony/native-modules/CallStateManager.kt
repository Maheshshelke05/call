package com.employeecalling.telephony

import android.telecom.Call
import android.telecom.DisconnectCause
import android.util.Log

enum class CallPlatformState {
    IDLE,
    DIALING,
    RINGING,
    ACTIVE,
    HOLDING,
    DISCONNECTING,
    DISCONNECTED,
    FAILED
}

interface CallStateListener {
    fun onCallStateChanged(state: CallPlatformState, durationSeconds: Long, disconnectReason: String?)
    fun onCallEnded(totalDurationSeconds: Long, talkDurationSeconds: Long, disconnectCause: String)
}

class CallStateManager {

    private val tag = "CallStateManager"
    private var activeCall: Call? = null
    private var callStartTimeMs: Long = 0L
    private var callConnectTimeMs: Long = 0L
    private var currentPlatformState = CallPlatformState.IDLE
    private var listener: CallStateListener? = null

    fun setListener(listener: CallStateListener?) {
        this.listener = listener
    }

    fun attachCall(call: Call) {
        this.activeCall = call
        this.callStartTimeMs = System.currentTimeMillis()
        this.callConnectTimeMs = 0L

        call.registerCallback(object : Call.Callback() {
            override fun onStateChanged(call: Call, state: Int) {
                super.onStateChanged(call, state)
                handleAndroidCallState(call, state)
            }
        })

        handleAndroidCallState(call, call.state)
    }

    private fun handleAndroidCallState(call: Call, state: Int) {
        val platformState = when (state) {
            Call.STATE_NEW, Call.STATE_CONNECTING -> CallPlatformState.DIALING
            Call.STATE_DIALING -> CallPlatformState.DIALING
            Call.STATE_RINGING -> CallPlatformState.RINGING
            Call.STATE_ACTIVE -> {
                if (callConnectTimeMs == 0L) {
                    callConnectTimeMs = if (call.details.connectTimeMillis > 0) call.details.connectTimeMillis else System.currentTimeMillis()
                }
                CallPlatformState.ACTIVE
            }
            Call.STATE_HOLDING -> CallPlatformState.HOLDING
            Call.STATE_DISCONNECTING -> CallPlatformState.DISCONNECTING
            Call.STATE_DISCONNECTED -> CallPlatformState.DISCONNECTED
            else -> CallPlatformState.IDLE
        }

        currentPlatformState = platformState

        val elapsed = if (callConnectTimeMs > 0L) {
            ((System.currentTimeMillis() - callConnectTimeMs) / 1000L).coerceAtLeast(0L)
        } else {
            0L
        }

        val disconnectCause = call.details.disconnectCause
        val reasonStr = disconnectCause?.description?.toString() ?: getDisconnectCauseCodeName(disconnectCause?.code)

        Log.d(tag, "Call state transition -> $platformState (elapsed: ${elapsed}s, reason: $reasonStr)")
        listener?.onCallStateChanged(platformState, elapsed, reasonStr)

        if (platformState == CallPlatformState.DISCONNECTED) {
            val totalDuration = ((System.currentTimeMillis() - callStartTimeMs) / 1000L).coerceAtLeast(0L)
            listener?.onCallEnded(totalDuration, elapsed, reasonStr)
            activeCall = null
        }
    }

    private fun getDisconnectCauseCodeName(code: Int?): String {
        return when (code) {
            DisconnectCause.BUSY -> "BUSY"
            DisconnectCause.CANCELED -> "CANCELED"
            DisconnectCause.ERROR -> "ERROR"
            DisconnectCause.LOCAL -> "LOCAL_HANGUP"
            DisconnectCause.MISSED -> "MISSED"
            DisconnectCause.REJECTED -> "REJECTED"
            DisconnectCause.REMOTE -> "REMOTE_HANGUP"
            DisconnectCause.RESTRICTED -> "RESTRICTED"
            else -> "UNKNOWN"
        }
    }

    fun getCurrentState(): CallPlatformState = currentPlatformState

    fun disconnect() {
        try {
            activeCall?.disconnect()
        } catch (e: Exception) {
            Log.e(tag, "Failed to disconnect call: ${e.message}")
        }
    }

    fun hold(hold: Boolean) {
        try {
            if (hold) activeCall?.hold() else activeCall?.unhold()
        } catch (e: Exception) {
            Log.e(tag, "Failed to toggle hold: ${e.message}")
        }
    }
}
