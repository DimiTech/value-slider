(function(global) {

	"use strict";

	/**
	*	Widget constructor
	*
	*	@class ValueSlider
	*	@classdesc Creates a new value slider widget around the given <input> element
	*	
	*	@param {Object} options - Options for initializing the component
	*/
	var ValueSlider = function(options) {

		setParentDiv(this, options.element);
		
		createWidget(this);

		setMinMaxAndStep(this, options.minValue || 0, 
							   options.maxValue || 100, 
							   options.step     || 1   );

		/** 
		*	Short-circuit evaluate the widget value
		*   If no value property is specified on the options object take the value from the parent <input>'s value attribute. 
		*   If <input> doesn't have a value then set the value to 0. 
		*/
		this.setValue(options.value ||
					  parseInt(this.parentDiv.getElementsByTagName('input')[0].defaultValue) ||
					  0);

		setEventListeners(this);

		// Show the widget only when it's completely loaded
		this.show();
	};

	/* ------------------------------------- Private functions ------------------------------------- */

	// Insert desc
	function setParentDiv(self, parentInput) {

		var inputElem; // Our widget's input element (which will store it's value, useful for POST requests)

		if (parentInput[0] !== undefined && parentInput[0].tagName === 'INPUT') // Handle the jQuery selector
			inputElem = parentInput[0];
		else if (parentInput.tagName === 'INPUT') // Handle document.getElementById()
			inputElem = parentInput;
		else // The user hasn't supplied a proper parent <input> element
			throw new Error('Please supply an <input> element in which you wish to load the "ValueSlider" widget into.');

		// Wrap the <input> element in a <div>
		var parentDiv = document.createElement('div');
		parentDiv.className = 'value-slider';

		// Insert our wrapper <div> element before the <input>
		inputElem.parentNode.insertBefore(parentDiv, inputElem);

		// Move the <input> into the wrapper <div>
		parentDiv.appendChild(inputElem);

		// Hide the <input> element, we don't really want to see it
		inputElem.style.display = 'none';

		// Save a reference to the wrapping <div> as a property
		self.parentDiv = parentDiv;
	}

	// Creates HTML elements needed for the widget
	function createWidget(self) {
		// Create a container <div>
		self.widget = document.createElement('div');
		self.widget.className = 'value-slider-body'; 
		self.parentDiv.appendChild(self.widget);

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
		if (min < max) {
			self.minValue = min;
			self.maxValue = max;
		} else
			throw new Error('Slider\'s minValue must be smaller than its maxValue.');

		// Check if step divides the value range correctly
		if ((self.maxValue - self.minValue) % step === 0)
			self.step = step;
		else
			throw new Error('Slider\'s range (maxValue - minValue) must be divisible by step value without a remainder.');
	}

	/**
	*	The main rendering function
	*/
	function renderValue(self) {
		var valueSliderDiv = self.widget.children[0];

		var value = ~~((self.rightValue - self.minValue) * 100 / (self.maxValue - self.minValue));

		valueSliderDiv.style.width = value + '%';
	}

	// Take step into account
	function calculateSteps(self) {
		var stepRemainder = self.rightValue % self.step;

		// smooth out the transitions
		if (stepRemainder >= self.step / 2)
			self.rightValue = self.rightValue - stepRemainder + self.step;
		else
			self.rightValue = self.rightValue - stepRemainder;
	}

	// Update the <input> element's value
	function updateInputValue(self) {
		self.parentDiv.querySelector('input').value 	   = self.rightValue;	
		self.parentDiv.querySelector('input').defaultValue = self.rightValue;
	}

	function clipValue(value, min, max, toInt) {
		if (value < min)
			value = min;
		else if (value > max)
			value = max;

		if (toInt) value = ~~value;

		return value;
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

			event.preventDefault(); // Prevents selection

			if (self.rightHandleMouseDown === false) 
				self.rightHandleMouseDown = true;

			document.addEventListener('mouseup', function(event) { 
				if (self.rightHandleMouseDown) 
					self.rightHandleMouseDown = false; 
			});

			document.addEventListener('mousemove', function(event) {
				if (self.rightHandleMouseDown && event.which === 1) {

					// Get mouse position on the slider
					var mousePosition = getPositionOnSlider(self, event.clientX);

					mousePosition = clipValue(mousePosition, 0, 1, false);
					
					// Update the value
					self.setRightPercent(mousePosition);
				}
			});
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

		self.widget.addEventListener('mousedown', function(event) {
			if (self.rightHandleMouseDown === false) {

				var mousePosition = getPositionOnSlider(self, event.clientX);
				self.setRightPercent(mousePosition);
				
				// Simulate mousedown event on the right handle
				simulateMouseDown(rightHandle);
			}
		});

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

			var value = ~~ (perc * (this.maxValue - this.minValue) + this.minValue);

			// Set the value
			this.rightValue = clipValue(value, 0, this.maxValue, true);


			if (this.step !== 0)
				calculateSteps(this);

			updateInputValue(this);

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

			this.rightValue = clipValue(value, this.minValue, this.maxValue, true); // Set the value

			if (this.step !== 0)
				calculateSteps(this);

			updateInputValue(this);

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