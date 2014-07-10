L.Map.GamepadController = L.Handler.extend({
	options: {
		analogicCoef: 0.25, // coefficient for converting the raw values in pixels 
		speedLimit: 15, // speed limits in pixels
		zoomTrigger: 30, // The value for triggering a zoom
		zoomReset: 5, // The value representing the end of a zoom,
		slowBoost: 3 // coefficient for boosting the slow movements
	},

	addHooks: function() {
		this._dragging = false;
		this._point = new L.Point(0,0);
		this._inZoom = false;

		if (!this._onceLock) {
			this._onceLock = true;
			window.addEventListener('gamepadconnected',
				L.bind(function() {
				this._gamepadDetected = true;
				if (this._enabled) {
					this._gamepadRequest = L.Util.requestAnimFrame(this._gamepadLoop, this);
				}
			}, this));
		} else if (this._gamepadDetected && !this._gamepadRequest) {
			this._gamepadRequest = L.Util.requestAnimFrame(this._gamepadLoop, this);
		}
	},

	removeHooks: function() {
		if (this._gamepadRequest) {
			L.Util.cancelAnimFrame(this._gamepadRequest);
			this._gamepadRequest = null;
		}
	},

	_gamepadLoop: function() {
		var gamepads = navigator.getGamepads();

		var found = false;
		for (var i = 0, l = gamepads.length; i < l; ++i) {
			if (this._gamepad(gamepads[i])) {
				found = true;
				break;
			}	
		}
		
		if (!found && this._dragging) {
			this._dragging = false;
			this._map.fire('dragend').fire('moveend');
		}

		if (this._enabled) {
			this._gamepadRequest = L.Util.requestAnimFrame(this._gamepadLoop, this);
		}
	},

	_gamepad: function(gamepad) {

		// If the gamepad is valid
		if (!gamepad || !gamepad.axes || gamepad.axes.length < 2) {
			return false;
		}

		// If the gamepad contains an zoom axis
		if (gamepad.axes.length >= 3) {

			var zoom = gamepad.axes[2];

			// If the user is still zooming the map
			if (this._inZoom) {

				// The map is static while the gamepad is still in a zoom action
				if (Math.abs(zoom) > this.options.zoomReset) {
					return true;
				}

				// Or the user stopped to zoom
				this._inZoom = false;
			} else {
				// We trigger the zoom only if the value is higher a huge limit
				if (zoom > this.options.zoomTrigger) {
					this._map.zoomIn();
					this._inZoom = true;
					return true;
				} else if (zoom < -this.options.zoomTrigger) {
					this._map.zoomOut();
					this._inZoom = true;
					return true;
				}
			}
		}

		var analogicCoef = this.options.analogicCoef,
			limitUp = this.options.speedLimit,
			limitDown = -limitUp,
			point = this._point,

			ya = this.options.slowBoost,
			xb = 10, yb = 1,
			interpolation = ((yb - ya)/xb),

			axe1 = gamepad.axes[0] * analogicCoef,
			axe2 = gamepad.axes[1] * analogicCoef;

		var v = Math.round(
			Math.max(Math.min((ya + axe2 * interpolation) * axe2,
				limitUp), limitDown)),
			vv = Math.round(
				Math.max(Math.min((ya + axe1 * interpolation) * axe1,
					limitUp), limitDown));

		// If the map is moved
		if (Math.abs(v) > 1 && Math.abs(vv) > 1) {
			point.x = vv;
			point.y = v;

			if (!this._dragging) {
				this._dragging = true;	
				if (this._map._panAnim) {
					this._map._panAnim.stop();
				}
				this._map.fire('movestart').fire('dragstart');
			} else {
				this._map.fire('move').fire('drag');
			}

			this._map._rawPanBy(point);

			return true;
		}

		return false;
	}

});

L.Map.addInitHook('addHandler', 'GamepadController', L.Map.GamepadController);