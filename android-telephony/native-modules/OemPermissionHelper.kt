package com.employeecalling.telephony

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log

object OemPermissionHelper {

    private const val TAG = "OemPermissionHelper"

    fun isIgnoringBatteryOptimizations(context: Context): Boolean {
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return true
        return powerManager.isIgnoringBatteryOptimizations(context.packageName)
    }

    fun requestIgnoreBatteryOptimizations(context: Context) {
        try {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:${context.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            Log.w(TAG, "Cannot launch ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS: ${e.message}")
        }
    }

    fun openOemBackgroundSettings(context: Context): Boolean {
        val manufacturer = Build.MANUFACTURER.lowercase()
        val brand = Build.BRAND.lowercase()

        val intents = mutableListOf<Intent>()

        when {
            manufacturer.contains("xiaomi") || brand.contains("xiaomi") || brand.contains("redmi") || brand.contains("poco") -> {
                intents.add(
                    Intent("miui.intent.action.APP_PERM_EDITOR").apply {
                        setClassName("com.miui.securitycenter", "com.miui.permcenter.permissions.PermissionsEditorActivity")
                        putExtra("extra_pkgname", context.packageName)
                    }
                )
            }
            manufacturer.contains("vivo") || brand.contains("vivo") || brand.contains("iqoo") -> {
                intents.add(
                    Intent().apply {
                        setClassName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.PurviewTabActivity")
                        putExtra("packagename", context.packageName)
                    }
                )
            }
            manufacturer.contains("oppo") || brand.contains("oppo") || brand.contains("realme") -> {
                intents.add(
                    Intent().apply {
                        setClassName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity")
                    }
                )
            }
            manufacturer.contains("samsung") -> {
                intents.add(
                    Intent().apply {
                        setClassName("com.samsung.android.lool", "com.samsung.android.sm.battery.ui.BatteryActivity")
                    }
                )
            }
        }

        // Generic application details fallback
        intents.add(
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${context.packageName}")
            }
        )

        for (intent in intents) {
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                return true
            } catch (_: Exception) {}
        }
        return false
    }
}
