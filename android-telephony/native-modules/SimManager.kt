package com.employeecalling.telephony

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import android.telephony.SubscriptionInfo
import android.telephony.SubscriptionManager
import android.util.Log
import androidx.core.content.ContextCompat

data class SimAccountInfo(
    val slotIndex: Int,            // 0 for SIM 1, 1 for SIM 2
    val subscriptionId: Int,       // Android Subscription ID
    val carrierName: String,       // e.g. "Jio", "Airtel", "Vi"
    val displayName: String,       // User label or carrier
    val iccId: String?,            // SIM identifier (masked for security)
    val isDefaultData: Boolean,
    val isDefaultVoice: Boolean,
    val phoneAccountHandleId: String?
)

class SimManager(private val context: Context) {

    private val tag = "SimManager"
    private val telecomManager = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
    private val subscriptionManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager

    fun getActiveSimAccounts(): List<SimAccountInfo> {
        val result = mutableListOf<SimAccountInfo>()

        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
            Log.w(tag, "READ_PHONE_STATE permission not granted")
            return emptyList()
        }

        try {
            val phoneAccounts = telecomManager.callCapablePhoneAccounts ?: emptyList()
            val subList = try {
                subscriptionManager?.activeSubscriptionInfoList ?: emptyList()
            } catch (e: SecurityException) {
                emptyList<SubscriptionInfo>()
            }

            for (index in phoneAccounts.indices) {
                val handle = phoneAccounts[index]
                val phoneAccount = try { telecomManager.getPhoneAccount(handle) } catch (e: Exception) { null }
                val label = phoneAccount?.label?.toString() ?: "SIM ${index + 1}"
                
                // Match with SubscriptionInfo if available
                val matchedSub = subList.find { sub ->
                    handle.id.contains(sub.subscriptionId.toString()) || sub.simSlotIndex == index
                }

                val slot = matchedSub?.simSlotIndex ?: index
                val carrier = matchedSub?.carrierName?.toString() ?: label
                val subId = matchedSub?.subscriptionId ?: -1

                result.add(
                    SimAccountInfo(
                        slotIndex = slot,
                        subscriptionId = subId,
                        carrierName = carrier,
                        displayName = label,
                        iccId = matchedSub?.iccId?.takeLast(4)?.let { "••••$it" },
                        isDefaultData = false,
                        isDefaultVoice = (index == 0),
                        phoneAccountHandleId = handle.id
                    )
                )
            }
        } catch (e: Exception) {
            Log.e(tag, "Error querying SIM accounts: ${e.message}", e)
        }

        return result
    }

    fun getPhoneAccountForSlot(slotIndex: Int): PhoneAccountHandle? {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
            return null
        }
        val accounts = telecomManager.callCapablePhoneAccounts ?: return null
        if (slotIndex in accounts.indices) {
            return accounts[slotIndex]
        }
        return accounts.firstOrNull()
    }
}
