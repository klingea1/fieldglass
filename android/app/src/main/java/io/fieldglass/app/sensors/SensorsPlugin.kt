package io.fieldglass.app.sensors

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.HandlerThread
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONObject

/**
 * Streams Android SensorManager readings to the web layer.
 *
 * Readings are batched and sent as a "readings" event roughly 30 times a second,
 * so high sample rates don't flood the bridge with one message per sample.
 * All state lives on one background thread; sensor callbacks arrive there too.
 */
@CapacitorPlugin(name = "Sensors")
class SensorsPlugin : Plugin() {

    private lateinit var sensorManager: SensorManager
    private lateinit var thread: HandlerThread
    private lateinit var handler: Handler

    /** Sensors the web layer asked for, with their sample period, kept across pause/resume. */
    private val requested = mutableMapOf<String, Int>()
    private val listeners = mutableMapOf<String, SensorEventListener>()
    private var pending = JSArray()
    private var flushScheduled = false
    private var paused = false

    override fun load() {
        sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        thread = HandlerThread("fieldglass-sensors").apply { start() }
        handler = Handler(thread.looper)
    }

    /** Every sensor on the device, including ones fieldglass doesn't use yet. */
    @PluginMethod
    fun listSensors(call: PluginCall) {
        val sensors = JSArray()
        for (sensor in sensorManager.getSensorList(Sensor.TYPE_ALL)) {
            val isDefault = sensorManager.getDefaultSensor(sensor.type) == sensor
            val type = if (isDefault) TYPES.entries.firstOrNull { it.value == sensor.type }?.key else null
            val info = JSObject()
            info.put("type", type ?: JSONObject.NULL)
            info.put("androidType", sensor.stringType)
            info.put("name", sensor.name)
            info.put("vendor", sensor.vendor)
            info.put("version", sensor.version)
            info.put("maxRange", sensor.maximumRange.toDouble())
            info.put("resolution", sensor.resolution.toDouble())
            info.put("powerMa", sensor.power.toDouble())
            info.put("maxRateHz", if (sensor.minDelay > 0) 1_000_000.0 / sensor.minDelay else 0.0)
            info.put("wakeUp", sensor.isWakeUpSensor)
            info.put("isDefault", isDefault)
            sensors.put(info)
        }
        val result = JSObject()
        result.put("sensors", sensors)
        call.resolve(result)
    }

    @PluginMethod
    fun start(call: PluginCall) {
        val type = call.getString("type") ?: return call.reject("type is required")
        val androidType = TYPES[type] ?: return call.reject("Unknown sensor type: $type")
        val rateHz = (call.getDouble("rateHz") ?: DEFAULT_RATE_HZ).coerceIn(1.0, MAX_RATE_HZ)
        val periodUs = (1_000_000 / rateHz).toInt()

        handler.post {
            val sensor = sensorManager.getDefaultSensor(androidType)
            if (sensor == null) {
                call.reject("This phone has no $type sensor", "UNAVAILABLE")
                return@post
            }
            requested[type] = periodUs
            if (!paused) register(type, sensor, periodUs)
            call.resolve()
        }
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        val type = call.getString("type") ?: return call.reject("type is required")
        handler.post {
            requested.remove(type)
            unregister(type)
            call.resolve()
        }
    }

    // Sensors keep draining the battery in the background, so release them while
    // the app isn't visible and pick up where we left off when it returns.
    override fun handleOnPause() {
        handler.post {
            paused = true
            listeners.keys.toList().forEach { unregister(it) }
        }
    }

    override fun handleOnResume() {
        handler.post {
            paused = false
            for ((type, periodUs) in requested) {
                val sensor = TYPES[type]?.let { sensorManager.getDefaultSensor(it) } ?: continue
                register(type, sensor, periodUs)
            }
        }
    }

    override fun handleOnDestroy() {
        handler.post { listeners.keys.toList().forEach { unregister(it) } }
        thread.quitSafely()
    }

    private fun register(type: String, sensor: Sensor, periodUs: Int) {
        unregister(type)
        val listener = object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) = enqueue(type, event)
            override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {}
        }
        listeners[type] = listener
        sensorManager.registerListener(listener, sensor, periodUs, handler)
    }

    private fun unregister(type: String) {
        listeners.remove(type)?.let { sensorManager.unregisterListener(it) }
    }

    private fun enqueue(type: String, event: SensorEvent) {
        val values = JSArray()
        for (value in event.values) {
            values.put(if (value.isFinite()) value.toDouble() else JSONObject.NULL)
        }
        val reading = JSObject()
        reading.put("type", type)
        // Nanoseconds since boot, converted to milliseconds.
        reading.put("timestamp", event.timestamp / 1_000_000.0)
        reading.put("values", values)
        reading.put("accuracy", accuracyName(event.accuracy))
        pending.put(reading)

        if (!flushScheduled) {
            flushScheduled = true
            handler.postDelayed({ flush() }, FLUSH_INTERVAL_MS)
        }
    }

    private fun flush() {
        flushScheduled = false
        if (pending.length() == 0) return
        val batch = JSObject()
        batch.put("readings", pending)
        pending = JSArray()
        notifyListeners("readings", batch)
    }

    companion object {
        /** fieldglass sensor names mapped to Android sensor types. Keep in sync with src/core/sensors/types.ts. */
        val TYPES = mapOf(
            "accelerometer" to Sensor.TYPE_ACCELEROMETER,
            "gravity" to Sensor.TYPE_GRAVITY,
            "gyroscope" to Sensor.TYPE_GYROSCOPE,
            "magnetometer" to Sensor.TYPE_MAGNETIC_FIELD,
            "magnetometer-uncalibrated" to Sensor.TYPE_MAGNETIC_FIELD_UNCALIBRATED,
            "light" to Sensor.TYPE_LIGHT,
            "pressure" to Sensor.TYPE_PRESSURE,
        )

        const val DEFAULT_RATE_HZ = 50.0

        /** Android 12+ caps rates at 200 Hz unless the app holds HIGH_SAMPLING_RATE_SENSORS. */
        const val MAX_RATE_HZ = 200.0

        const val FLUSH_INTERVAL_MS = 33L

        fun accuracyName(accuracy: Int): String = when (accuracy) {
            SensorManager.SENSOR_STATUS_ACCURACY_HIGH -> "high"
            SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM -> "medium"
            SensorManager.SENSOR_STATUS_ACCURACY_LOW -> "low"
            else -> "unreliable"
        }
    }
}
