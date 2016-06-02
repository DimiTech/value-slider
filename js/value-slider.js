(function(global) {

	"use strict";


	/**
	*	Widget constructor
	*
	*	@class ValueSlider
	*	@classdesc Creates a new "value slider" widget inside the given <div> element
	*	
	*	@param {Object} options - Options for initializing the component

		// TODO: DELETE THIS
	*	@param {Object} options.div - The div element which will contain the widget
	*	@param {Number} options.value - Value of the single handle
	*	@param {Number} options.rightValue - Value of the right handle
	*	@param {Number} options.leftValue - Value of the left handle
	*	@param {Number} options.minValue - Widget's minimum value (the default is 0)
	*	@param {Number} options.maxValue - Widget's minimum value (the default is 100)
	*	@param {Number} options.step - Widget's value step (the defualt is 1)
	*
	*/
	var ValueSlider = function(options) {

		setParentDiv(this, options.div);
		
		createWidget(this);

		setMinMaxAndStep(this, options.minValue || 0, 
							   options.maxValue || 100, 
							   options.step     || 1   );

		this.setValue(options.value || 0); // Short-circuit evaluate the value value

		setEventListeners(this);

		// Show the widget only when it's completely loaded
		this.show();
	};

	/* ------------------------------------- Private functions ------------------------------------- */

	// Handles declaring the user given <div> element as the parentElement property 
	function setParentDiv(self, parentDiv) {
		if (parentDiv[0] !== undefined && parentDiv[0].tagName === 'DIV') // Handle the jQuery selector
			self.parentElement = parentDiv[0];
		else if (parentDiv.tagName === 'DIV') // Handle document.getElementById()
			self.parentElement = parentDiv;
		else // The user hasn't supplied a proper parent <div> element
			throw new Error('Please supply a <div> element in which you wish to load the "ValueSlider" widget into.');
	}

	// Creates HTML elements needed for the widget
	function createWidget(self) {
		// Create a container <div>
		self.widget = document.createElement('div');
		self.widget.className = 'value-slider-body'; 
		self.parentElement.appendChild(self.widget);

		// Hide the widget until it's fully loaded
		self.hide();

		// Create a slider value <div> and append it to the container <div>
		var valueSliderDiv = document.createElement('div');
		valueSliderDiv.className = 'slider-value-right';
		self.widget.appendChild(valueSliderDiv);

		// Create a right handle <div> and append it to the loading line <div>
		var rightHandleDiv = document.createElement('div');
		rightHandleDiv.className = 'slider-handle-right';
		self.widget.children[0].appendChild(rightHandleDiv);
	}

	function setMinMaxAndStep(self, min, max, step) {
		self.minValue = min;
		self.maxValue = max;
		self.step     = step;
	}

	// Renders the widget
	function renderValue(self) {
		var valueSliderDiv = self.widget.children[0];
		var value = ~~(self.rightValue * 100 / (self.maxValue - self.minValue));
		valueSliderDiv.style.width = value + '%';
	}

	// Checks and cleans slider values
	function cleanValue(self, value) {
		value = ~~ (value * (self.maxValue - self.minValue)); // Cast to int
		value = clipValue(value, self.minValue, self.maxValue, true);
		return value;
	}

	function clipValue(value, min, max, toInt) {
		if (value < min)
			value = min;
		else if (value > max)
			value = max;

		if (toInt) value = ~~value;

		return value;
	}

	// Clears user text selection on the page
	function clearSelection() {
	    if (document.selection) {
	        document.selection.empty();
	    } else if (window.getSelection) {
	        window.getSelection().removeAllRanges();
	    }
	}

	/* -------------------------------------- Event Listeners -------------------------------------- */	

	function setEventListeners(self) {

		setRightHandleListener(self);

		setClickListener(self);

	}

	function setRightHandleListener(self) {

		var rightHandle = self.widget.getElementsByClassName('slider-handle-right')[0];
		self.rightHandleMouseDown = false;

		rightHandle.onmousedown = function(event) {

			// We need to clear the selection to prevent bugs in chrome and old IE browsers
			clearSelection();

			if (self.rightHandleMouseDown === false) 
				self.rightHandleMouseDown = true;

			document.onmouseup   = function(event) { if (self.rightHandleMouseDown) self.rightHandleMouseDown = false; };

			document.onmousemove = function(event) {

				if (self.rightHandleMouseDown && event.which === 1) {

					// Get mouse position on the slider
					var mousePosition = getPositionOnSlider(self, event.clientX);

					mousePosition = clipValue(mousePosition, 0, 1, false);
				
					self.setPercent(mousePosition);
				}
			};
		};

	}

	/**
	*	Returns the position of the mouse on the slider - from 0 to 100
	*
	*	@returns {Number} mousePosition
	*/
	function getPositionOnSlider(self, clientX) {
		var mousePosition = ((clientX - self.widget.offsetLeft) / self.widget.clientWidth + 0.005);
		return mousePosition;
	}

	function setClickListener(self) {
		var rightHandle = self.widget.getElementsByClassName('slider-handle-right')[0];

		self.widget.onmousedown = function(event) {
			if (self.rightHandleMouseDown === false) {

				var mousePosition = getPositionOnSlider(self, event.clientX);
				self.setPercent(mousePosition);
				
				// Simulate mousedown event on the right handle
				simulateMouseDown(rightHandle);
			}
		};

		function simulateMouseDown(node) {
			var mouseDownEvt = document.createEvent('MouseEvents');
			mouseDownEvt.initEvent('mousedown', true, true);
			node.dispatchEvent(mouseDownEvt);
		}
	}

	/* ---------------------------------------- Public API ----------------------------------------- */
	
	// __________ Setters __________ \\

	ValueSlider.prototype.setPercent = function(perc) {
		this.setRightPercent(perc, 'setPercent()');
	};

	ValueSlider.prototype.setRightPercent = function(perc, funcName) {
		if (typeof perc === 'number') {

			var value = cleanValue(this, perc);

			// Set the value
			this.rightValue = value;

			// Render the widget		
			renderValue(this);
		} else 
			throw new Error((funcName || 'setRightPercent()') + ' expects a floating point number parameter! (a value from 0.0 to 1.0)');
	};

	ValueSlider.prototype.setValue = function(value) {
		this.setRightValue(value, 'setValue()');
	};

	ValueSlider.prototype.setRightValue = function(value, funcName) {
		if (typeof value === 'number') {
			this.rightValue = clipValue(value, self.minValue, self.maxValue, true); // Set the value
			renderValue(this); // Render the widget
		} else 
			throw new Error((funcName || 'setRightValue()') + ' expects a number parameter! (a value from ' + this.minValue + ' to ' + this.maxValue + ')');
	};


	// __________ Getters __________ \\

	ValueSlider.prototype.getValue = function() {
		return this.getRightValue();
	};

	ValueSlider.prototype.getRightValue = function() {
		return this.rightValue;
	};


	// ______ Display methods ______ \\

	ValueSlider.prototype.hide = function() {
		this.widget.style.visibility = 'hidden';
	};

	ValueSlider.prototype.show = function() {
		this.widget.style.visibility = 'visible';
	};

	ValueSlider.prototype.remove = function() {
		this.display('none');
	};

	ValueSlider.prototype.display = function(display) {
		var displayVal = display || 'block';
		this.widget.style.display = displayVal;
	};

	/* ------------------------------------ Public Constructor ------------------------------------- */

	global.ValueSlider = ValueSlider;

})(window);