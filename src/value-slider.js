(function(global) {

	"use strict";

	/**
	*	Widget constructor
	*
	*	@class ValueSlider
	*	@classdesc Creates a new value slider widget around the given <input> element.
	*	
	*	@param {Object} options - Options for initializing the component.
	*/
	var ValueSlider = function(options) {

		setParentDiv(this, options.element);
		
		createWidget(this, options);

		setMinMaxAndStep(this, options.minValue || 0, 
							   options.maxValue || 100, 
							   options.step     || 1   );


		if (options.vertical === true)
			setToVertical(this, options.range !== undefined);

		// If this is a range slider initialize its values
		if (options.range !== undefined) {
			this.setRightValue(options.range.rightValue || (options.maxValue || 100));
			this.setLeftValue(options.range.leftValue   || (options.minValue || 0));
		} else { // If it's a regular slider with 1 handle

			/** 
			*	Short-circuit evaluate the widget value.
			*   If no value property is specified on the options object take the value from the parent <input>'s value attribute. 
			*   If <input> doesn't have a value then set the value to 0. 
			*/
			this.setValue(options.value || parseInt(this.parentDiv.getElementsByTagName('input')[0].defaultValue) || 0);
		}

		setEventListeners(this, options.range);

		// Show the widget only when it's completely loaded
		this.show();
	};

	/* ------------------------------------- Private functions ------------------------------------- */

	// Create a parent <div> element around our <input> parent element
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
	function createWidget(self, options) {
		// Create a container <div>
		self.widget = document.createElement('div');
		self.widget.className = 'value-slider-body'; 
		self.parentDiv.appendChild(self.widget);

		// Hide the widget until it's fully loaded
		self.hide();

		// Create a slider value <div> and append it to the container <div>
		var valueSliderDiv = document.createElement('div');
		valueSliderDiv.className = 'slider-value';
		self.widget.appendChild(valueSliderDiv);

		if (options.showBuffer === true && options.range === undefined) {
			// Create a slider value <div> and append it to the container <div>
			var bufferDiv = document.createElement('div');
			bufferDiv.className = 'slider-buffered';
			self.widget.appendChild(bufferDiv);
			self.showBuffer = true;
			self.buffered = 0;
		}

		// If this is a range slider
		if (options.range !== 'undefined' && typeof options.range === 'object') {

			// Create a left handle <div> and append it to the loading line <div>
			var leftHandleDiv = document.createElement('div');
			leftHandleDiv.className = 'slider-handle-left';
			self.widget.children[0].appendChild(leftHandleDiv);
		}

		if (options.showMouseAt === true && options.range === undefined) { // Show mouse position indicator
			var mouseAtDiv = document.createElement('div');
			mouseAtDiv.className = 'slider-mouseat';
			self.widget.appendChild(mouseAtDiv);
			self.mouseAt = 0;
		}

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
			throw new Error('Slider\'s range (maxValue - minValue) must be divisible by step value without producing a remainder.');
	}

	// Change the widget orientation to vertical
	function setToVertical(self, isRangeSlider) {
		self.parentDiv.className += '-vertical';
		self.widget.className    += '-vertical';
		var rightHandle = self.widget.getElementsByClassName('slider-handle-right')[0];
		rightHandle.className    += '-vertical';

		// If it's a range slider (range slider has a 'leftValue' property)
		if (isRangeSlider) {
			var leftHandle = self.widget.getElementsByClassName('slider-handle-left')[0];
			leftHandle.className    += '-vertical';
		}

		var sliderVal = self.widget.getElementsByClassName('slider-value')[0];
		sliderVal.className += '-vertical';

		self.vertical = true;

	}

	/**
	*	The main rendering function.
	*
	*	@param {Boolean} leftHandle - indicates that the leftHandle is moved.
	*/
	function renderValue(self, leftHandle) {

		var sliderValClassName = 'slider-value';
		if (self.vertical === true) 
			sliderValClassName += '-vertical';

		var valueSliderDiv = self.widget.getElementsByClassName(sliderValClassName)[0];
		var value;

		if (leftHandle) { // The left value was altered

			value = (self.leftValue / (self.maxValue - self.minValue) * 100);

			if (self.vertical === true)
				valueSliderDiv.style.bottom = value + '%';
			else
				valueSliderDiv.style.left = value + '%';

			renderValue(self); // Keep the right handle in place. This executes the else' branch.
			
		} else { // The right value was altered
			value = (self.rightValue - (self.leftValue || self.minValue)) * 100 / (self.maxValue - self.minValue);
			
			if (self.vertical === true) {
				valueSliderDiv.style.height = value + '%';
				valueSliderDiv.style.top    = 100 - value + '%';
			}
			else
				valueSliderDiv.style.width = value + '%';
		}
		
	}

	// Take step into account
	function calculateSteps(step, value) {
		var stepRemainder = value % step;

		// smooth out the transitions
		if (stepRemainder >= step / 2)
			value = value - stepRemainder + step;
		else
			value = value - stepRemainder;

		return value;
	}

	// Update the <input> element's value
	function updateInputValue(self) {
		if (self.leftValue === undefined) { // If it's not a range widget...
			self.parentDiv.querySelector('input').value 	   = self.rightValue;	
			self.parentDiv.querySelector('input').defaultValue = self.rightValue;
		} else { // It is a range widget
			self.parentDiv.querySelector('input').value 	   = self.leftValue + ',' + self.rightValue;	
			self.parentDiv.querySelector('input').defaultValue = self.leftValue + ',' + self.rightValue;
		}
	}

	function clipValue(value, min, max, toInt) {
		if (value < min)
			value = min;
		else if (value > max)
			value = max;

		if (toInt) value = ~~value;

		return value;
	}

	function renderBuffer(self) {
		var bufferDiv = self.widget.getElementsByClassName('slider-buffered')[0];
		bufferDiv.style.width = self.buffered + '%';
	}

	/* -------------------------------------- Event Listeners -------------------------------------- */	

	function setEventListeners(self, range) {

		if (range !== undefined)
			setLeftHandleListener(self);

		setRightHandleListener(self);

		setClickListener(self);

		if (self.mouseAt !== undefined)
			setHoverListener(self);

	}

	function setRightHandleListener(self) {

		var rightHandle = getHandle(self, 'right');

		self.rightHandleMouseDown = false;

		rightHandle.onmousedown = function(event) {

			event.preventDefault(); // Prevents selection

			if (self.rightHandleMouseDown === false) 
				self.rightHandleMouseDown = true;

			document.addEventListener('mouseup', function(event) { 
				if (self.rightHandleMouseDown) 
					self.rightHandleMouseDown = false;

				// Hide the mouseAt <div>
				if (self.mouseAt !== undefined) 
					mouseAtValDiv.style.width = '0%';
			});

			if (self.mouseAt !== undefined)
				var mouseAtValDiv = self.widget.getElementsByClassName('slider-mouseat')[0];

			document.addEventListener('mousemove', function(event) {
				if (self.rightHandleMouseDown && event.which === 1) {

					// Get mouse position on the slider
					var mousePosition = getPositionOnSlider(self, event.clientX, event.clientY);
					
					// Update the value
					self.setRightPercent(mousePosition);

					if (self.mouseAt !== undefined) {
						self.mouseAt = ((rightHandle.offsetLeft + 10) / self.widget.offsetWidth) * 100;
						mouseAtValDiv.style.width = self.mouseAt + '%';
					}
					
				}
			});
		};

	}

	// Breaking the DRY rule somewhat, but I think this is the cleanest way to do it
	function setLeftHandleListener(self) {

		var leftHandle = getHandle(self, 'left');
		self.leftHandleMouseDown = false;

		leftHandle.onmousedown = function(event) {

			event.preventDefault(); // Prevents selection

			if (self.leftHandleMouseDown === false) 
				self.leftHandleMouseDown = true;

			document.addEventListener('mouseup', function(event) { 
				if (self.leftHandleMouseDown) 
					self.leftHandleMouseDown = false; 
			});

			document.addEventListener('mousemove', function(event) {
				if (self.leftHandleMouseDown && event.which === 1) {

					// Get mouse position on the slider
					var mousePosition = getPositionOnSlider(self, event.clientX, event.clientY);
					
					// Update the value
					self.setLeftPercent(mousePosition);
				}
			});
		};

	}

	// Returns the requested widget handle
	function getHandle(self, which) {
		var handle;
		if (self.vertical === true)
			handle = self.widget.getElementsByClassName('slider-handle-' + which + '-vertical')[0];
		else
			handle = self.widget.getElementsByClassName('slider-handle-' + which)[0];
		return handle;
	}

	/**
	*	Returns the position of the mouse on the slider - from 0.0 to 1.0.
	*
	*	@returns {Number} mousePosition - mouse position on the slider (in percents).
	*/
	function getPositionOnSlider(self, mouseX, mouseY) {
		var mousePosition;
		if (self.vertical === true)
			mousePosition = 1 - (mouseY - self.widget.offsetTop) / self.widget.clientHeight;
		else
			mousePosition = (mouseX - self.widget.offsetLeft) / self.widget.clientWidth;

		mousePosition = clipValue(mousePosition, 0, 1, false);
		return mousePosition;
	}

	function setClickListener(self) {
		var rightHandle = getHandle(self, 'right');
		var leftHandle  = getHandle(self, 'left');

		self.widget.addEventListener('mousedown', function(event) {
			if (self.rightHandleMouseDown === false) {

				event.preventDefault(); // Prevents selection

				var mousePosition = getPositionOnSlider(self, event.clientX, event.clientY);
				
				var closerToRight = true;

				// If there's a left handle
				if (self.leftValue !== undefined && self.leftHandleMouseDown !== undefined)
					closerToRight = checkIfCloserToRight(event.clientX, self);

				if (closerToRight) {
					// Simulate mousedown event on the right handle
					simulateMouseDown(rightHandle);
					self.setRightPercent(mousePosition);
				} else if (self.leftHandleMouseDown === false) {
					// Simulate mousedown event on the left handle
					simulateMouseDown(leftHandle);
					self.setLeftPercent(mousePosition);
				}
			}
		});

		function simulateMouseDown(node) {
			var mouseDownEvt = document.createEvent('MouseEvents');
			mouseDownEvt.initEvent('mousedown', true, true);
			node.dispatchEvent(mouseDownEvt);
		}

		// Checks if the mouse position is closer to the right handle 
		function checkIfCloserToRight(mouseX, self) {
			var sliderValClassName = 'slider-value';

			if (self.vertical === true)
				sliderValClassName += '-vertical';

			var sliderVal = self.parentDiv.getElementsByClassName(sliderValClassName)[0];

			return (mouseX - sliderVal.offsetLeft) > (sliderVal.clientWidth / 2);
		}
	}

	/**
	*	This function accomodates the width of the mouseAt overlay <div> to the mouse position on the widget.
	*/
	function setHoverListener(self) {
		var mouseAtValDiv = self.widget.getElementsByClassName('slider-mouseat')[0];

		self.widget.addEventListener('mousemove', function(event) {
			if (self.rightHandleMouseDown === false) {
				var mousePosition = getPositionOnSlider(self, event.clientX, event.clientY);

				if (self.step !== 1) // If step is defined (if it's not the default (1))
					mousePosition = adjustForSteps(self, mousePosition);

				// Also clip it just for safety
				self.mouseAt = clipValue(mousePosition, 0, 1, false);
				mouseAtValDiv.style.width = self.mouseAt * 100 + '%';
			}
		});

		self.widget.addEventListener('mouseleave', function(event) {
			self.mouseAt = 0;
			mouseAtValDiv.style.width = '0%';
		});

		function adjustForSteps(self, mousePosition) {
			var valRange = (self.maxValue - self.minValue);
			var value = mousePosition * valRange;
			value = calculateSteps(self.step, value);
			mousePosition = value / valRange;
			return mousePosition;
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
			var leftBound = this.leftValue !== undefined ? this.leftValue + (this.step || 1) : this.minValue;
			// Set the value
			this.rightValue = clipValue(value, leftBound, this.maxValue, true);


			if (this.step !== 0)
				this.rightValue = calculateSteps(this.step, this.rightValue);

			updateInputValue(this);

			// Render the widget		
			renderValue(this);
		} else 
			throw new Error((funcName || 'setRightPercent()') + ' expects a floating point number parameter! (a value from 0.0 to 1.0)');
	};

	ValueSlider.prototype.setLeftPercent = function(perc) {
		if (typeof perc === 'number') {

			var value = ~~ (perc * (this.maxValue - this.minValue) + this.minValue);
			var rightBound = this.rightValue ? this.rightValue - (this.step || 1) : this.maxValue;
			// Set the value
			this.leftValue = clipValue(value, 0, rightBound, true);

			if (this.step !== 0)
				this.leftValue = calculateSteps(this.step, this.leftValue);

			updateInputValue(this);

			// Render the widget	
			renderValue(this, true);
		} else 
			throw new Error('setLeftPercent() expects a floating point number parameter! (a value from 0.0 to 1.0)');
	};

	ValueSlider.prototype.setValue = function(value) {
		this.setRightValue(value, 'setValue()');
	};

	ValueSlider.prototype.setRightValue = function(value, funcName) {
		if (typeof value === 'number') {

			var leftBound = this.leftValue !== undefined ? this.leftValue + (this.step || 1) : this.minValue;
			this.rightValue = clipValue(value, leftBound, this.maxValue, true); // Set the value

			if (this.step !== 0)
				this.rightValue = calculateSteps(this.step, this.rightValue);

			updateInputValue(this);

			renderValue(this); // Render the widget
		} else 
			throw new Error((funcName || 'setRightValue()') + ' expects a number parameter! (a value from ' + this.minValue + ' to ' + this.maxValue + ')');
	};

	ValueSlider.prototype.setLeftValue = function(value) {
		if (typeof value === 'number') {

			var rightBound = this.rightValue ? this.rightValue - (this.step || 1) : this.maxValue;	
			this.leftValue = clipValue(value, 0, rightBound, true); // Set the value

			if (this.step !== 0)
				this.leftValue = calculateSteps(this.step, this.leftValue);

			updateInputValue(this);

			renderValue(this, true); // Render the widget
		} else 
			throw new Error('setLeftValue() expects a number parameter! (a value from ' + this.minValue + ' to ' + this.maxValue + ')');
	};

	/**
	*  @param {Number} perc - percentage expressed as a decimal number (0.0-1.0).
	*/
	ValueSlider.prototype.setBufferPercent = function(perc) {
		// Only execute if there is a buffer
		if (this.buffered !== undefined) {
			perc = clipValue(perc, 0, 1);
			this.buffered = ~~(perc * 100);
			renderBuffer(this, perc);
		} else
			throw new Error('setBufferPercent() works only when there is a buffer');		
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