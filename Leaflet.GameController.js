L.Map.GamepadController = L.Handler.extend({
	options: {
		analogicCoef: 1.3, // coefficient for converting the raw values in pixels 
		speedLimit: 20, // speed limits in pixels
		zoomTrigger: 30, // The value for triggering a zoom
		zoomReset: 5, // The value representing the end of a zoom
		interval: 25 // requestAnimationFrame is maybe too much, so it's an old setInterval
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
					if (!this._intervalId) {
						this._intervalId = window.setInterval(
							L.bind(this._gamepadLoop, this), this.options.interval);
					}
				}, this), true);
		} else if (this._gamepadDetected && !this._intervalId) {
			this._intervalId = window.setInterval(
				L.bind(this._gamepadLoop, this), this.options.interval);
		}
	},

	removeHooks: function() {
		if (this._intervalId) {
			window.clearInterval(this._intervalId);
			this._intervalId = 0;
		}
	},

	_gamepadLoop: function() {
		var gamepads = navigator.getGamepads();

		for (var i = 0, l = gamepads.length; i < l; ++i) {
			if (this._gamepad(gamepads[i])) {
				return;
			}	
		}
		
		if (this._dragging) {
			this._dragging = false;
			this._map.fire('dragend').fire('moveend');
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
			point = this._point;

		var v = Math.round(Math.max(Math.min(gamepad.axes[1]*analogicCoef,
			limitUp), limitDown)),
			vv = Math.round(Math.max(Math.min(gamepad.axes[0]*analogicCoef,
				limitUp), limitDown));

		// If the map is moved
		if (Math.abs(v) > 1 && Math.abs(vv) > 1) {
			point.x = vv;
			point.y = v;

			if (!this._dragging) {
				this._dragging = true;	
				if (lapin._panAnim) {
					lapin._panAnim.stop();
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