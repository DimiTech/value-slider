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

		setProperties(this, options.minValue || 0, 
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

		// Set the buffer value if a buffer is set
		if (this.buffered !== undefined)
			this.setBufferPercent(this.buffered);

		setEventListeners(this, options.range);

		// Show the widget only when it's completely loaded
		this.show();
	};

	/* ------------------------------------- Private functions ------------------------------------- */

	// Create a parent <div> element around our <input> parent element
	function setParentDiv(self, parentInput) {

		var inputElem; // Our widget's input element (which will store it's value, useful for POST requests)

		if (parentInput !== undefined && parentInput[0] !== undefined && parentInput[0].tagName === 'INPUT') // Handle the jQuery selector
			inputElem = parentInput[0];
		else if (parentInput !== undefined && parentInput.tagName === 'INPUT') // Handle document.getElementById()
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

		if (options.showBuffer === true && options.range === undefined && options.vertical !== true) {
			// Create a buffer value <div> and append it to the container <div>
			var bufferDiv = document.createElement('div');
			bufferDiv.className = 'slider-buffered';
			self.widget.appendChild(bufferDiv);
			self.buffered = options.buffered || 0;
		}

		// If this is a range slider
		if (options.range !== 'undefined' && typeof options.range === 'object') {

			// Create a left handle <div> and append it to the loading line <div>
			var leftHandleDiv = document.createElement('div');
			leftHandleDiv.className = 'slider-handle-left';
			valueSliderDiv.appendChild(leftHandleDiv);
		}

		if (options.showMouseAt === true && options.range === undefined && options.vertical !== true) { 
			// Show mouse position indicator
			var mouseAtDiv = document.createElement('div');
			mouseAtDiv.className = 'slider-mouseat';
			self.widget.insertBefore(mouseAtDiv, valueSliderDiv);
			self.mouseAt = 0;
		}

		// Create a right handle <div> and append it to the loading line <div>
		var rightHandleDiv = document.createElement('div');
		rightHandleDiv.className = 'slider-handle-right';
		valueSliderDiv.appendChild(rightHandleDiv);

		// If the user wants a tooltip
		if (options.showTooltip !== false) {
			// Create a tooltips
			var tooltipContainer = document.createElement('div');
			tooltipContainer.className = 'value-slider-tooltip';

			var tooltipArrow = document.createElement('div');
			if (options.vertical === true)
				tooltipArrow.className = 'arrow-left';
			else
				tooltipArrow.className = 'arrow-up';

			var tooltipBody = document.createElement('div');
			tooltipBody.className = 'tooltip-body';


			tooltipContainer.appendChild(tooltipArrow);
			tooltipContainer.appendChild(tooltipBody);
			self.parentDiv.appendChild(tooltipContainer);

			setUpTooltipLabel(self, options, tooltipBody, tooltipArrow);

			// Invert the tooltip if that option is specified
			if (options.invertTooltip === true) {

				// Change the arrow
				if (options.vertical === true) {
					tooltipArrow.className = 'arrow-right';

					self.widget.style.float = 'right';
					tooltipContainer.style.float = 'right';
				} else {
					tooltipArrow.className = 'arrow-down';
					tooltipArrow.style.top = tooltipBody.clientHeight + 'px';

					// Change the order of the elements
					self.parentDiv.removeChild(tooltipContainer);
					self.parentDiv.insertBefore(tooltipContainer, self.widget);
				}

				// Put the arrow below the tooltip body
				tooltipContainer.removeChild(tooltipArrow);
				tooltipContainer.appendChild(tooltipArrow);

			}
			self.hasTooltip = true;
		}

		function setUpTooltipLabel(self, options, body, arrow) {

			// Add default tooltip lable generating functions or use the one user has provided
			if (typeof options.tooltipLabel === 'function') {
				if (options.range !== 'undefined' && typeof options.range === 'object') {
					// Check if there are 2 parameters
					if (options.tooltipLabel.length === 2)
						self.generateTooltipLabel = options.tooltipLabel;
					else
						throw new Error('tooltipLabel() must be declared with 2 parameters, valueLeft and valueRight.');
					
				} else {
					self.generateTooltipLabel = options.tooltipLabel;
				}

				
			} else {
				// If it's a range slider
				if (options.range !== 'undefined' && typeof options.range === 'object')
					self.generateTooltipLabel = function(leftValue, rightValue) { return leftValue + ',' + rightValue; };
				else // It's a normal (1 handle) slider
					self.generateTooltipLabel = function(value) { return value; };
			}

			var longestPossibleLabel = String(self.generateTooltipLabel(options.maxValue, options.maxValue)); // The second arg is ignored this is a slider with a single handle
			body.textContent = longestPossibleLabel;

			if (options.vertical === true) { // Make adjustments on the vertical slider to fit the tooltip
				
				if (options.invertTooltip === true) {
					tooltipContainer.style.marginRight = '6px'; // TODO: Solve this in a better way
					self.parentDiv.style.width = body.clientWidth + arrow.clientWidth + 23 + 'px';
				} else {
					tooltipContainer.style.marginLeft = '17px'; // TODO: Solve this in a better way
					self.parentDiv.style.width = body.clientWidth + arrow.clientWidth + 23 + 'px';
				}

				/* 	HACK ALERT! :)
				* 	For some reason I have to use this dummy string in order for the tooltip to format properly.. 
				* 	I picked zeroes for the dummy string since it's a "medium width" character (not too long like 'W', not too short like 'l')
				* 	If next four lines didn't exist the tooltip css presentation would break
				*/
				var dummyString = '0';
				for (var i = longestPossibleLabel.length; i >= 0; i--)
					dummyString += '0';
				body.textContent = dummyString;
				// Weird but necessary...	

			} else {
				tooltipContainer.style.display = 'inline-block';
				body.textContent = longestPossibleLabel;
			}

		} // End of setUpTooltipLabel() function

	} // End of createWidget() function

	function setProperties(self, min, max, step) {
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

		if (self.buffered !== undefined) {
			var bufferDiv = self.widget.getElementsByClassName('slider-buffered')[0];
			bufferDiv.className += '-vertical';
		}

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

			value = 100 * (self.leftValue - self.minValue) / (self.maxValue - self.minValue);

			if (self.vertical === true) {
				value += ((self.maxValue - self.rightValue) / (self.maxValue - self.minValue)) * 100;
				valueSliderDiv.style.height = 100 - value + '%';

				// Render the tooltip at the end
				renderTooltip(self, value);
			} else {
				valueSliderDiv.style.left = value + '%';
				renderValue(self); // Keep the right handle in place. This executes the else' branch.
			}
			
		} else { // The right value was altered
			value = (self.rightValue - (self.leftValue || self.minValue)) * 100 / (self.maxValue - self.minValue);
			
			if (self.vertical === true) {
				valueSliderDiv.style.height = value + '%';

				if (self.leftValue === undefined)
					valueSliderDiv.style.top = 100 - value + '%';
				else { // We're dealing with a range slider
					value = 100 - ((self.leftValue - self.minValue) / (self.maxValue - self.minValue)) * 100 - value;
					valueSliderDiv.style.top = value + '%';
				}

			} else
				valueSliderDiv.style.width = value + '%';

			// Render the tooltip at the end
			renderTooltip(self, value);
			renderTooltip(self, value);
		}

	}

	function renderTooltip(self, value) {
		if (self.hasTooltip === true) {

			var tooltipDiv = self.parentDiv.getElementsByClassName('value-slider-tooltip')[0];

			if (self.vertical === true)
				adjustWidthAndHeight(self, tooltipDiv);

			adjustPosition(self, value, tooltipDiv);

			renderLabel(self, tooltipDiv);

			if (self.vertical === true)
				adjustWidthAndHeight(self, tooltipDiv); // Calling this function again to fix DOM rendering bugs..
		}

		// _____________________________ Nested tooltip functions ______________________________ \\

		function adjustWidthAndHeight(self, tooltipDiv) {
			
			var tooltipBody  = tooltipDiv.querySelector('.tooltip-body');

			var tooltipDivWidth  = tooltipBody.clientWidth  + 1; // We need 1 more px to fit everything in
			var tooltipDivHeight = tooltipBody.clientHeight + 1;

			// Add the arrows dimensions
			var tooltipArrow = tooltipDiv.querySelector('.arrow-left');

			if (tooltipArrow === null) // if the tooltip is inverted in the options
				tooltipArrow = tooltipDiv.querySelector('.arrow-right');

			tooltipDivWidth += tooltipArrow.offsetWidth;
			

			// Set tooltip width & height
			tooltipDiv.style.width  = tooltipDivWidth  + 'px';
			tooltipDiv.style.height = tooltipDivHeight + 'px';
		}

		function adjustPosition(self, value, tooltipDiv) {
			var position;
			if (self.leftValue === undefined) {	// If it's not a range slider

				if (self.vertical === true) {
					// Compensate for tooltip's height
					position = 100 - value - ( ((tooltipDiv.clientHeight / 2) / self.widget.clientHeight) * 100);
					tooltipDiv.style.top = position + '%';
				} else {
					// For some reason the "left" css property must go from -50% to 50%... which is fine, just subtract 50
					position = value - 50;
					tooltipDiv.style.left = position + '%';
				}

			} else { // It's a range slider
				// position = average position, position between handles
				position = 100 * ((self.rightValue + self.leftValue) / 2 - self.minValue) / (self.maxValue - self.minValue);
				// position -=   / (self.maxValue - self.minValue) * 100;
				if (self.vertical === true) {
					// Compensate for tooltip's height
					position = 100 - position - ((tooltipDiv.clientHeight / 2) / self.widget.clientHeight) * 100;
					tooltipDiv.style.top = position + '%';
				} else {
					// For some reason the "left" css property must go from -50% to 50%... which is fine, just subtract 50
					position -= 50;
					tooltipDiv.style.left = position + '%';
				}

			}
			
		} // end of adjustPosition() function

		function renderLabel(self, tooltipDiv) {
			var labelDiv = tooltipDiv.getElementsByClassName('tooltip-body')[0];

			if (self.leftValue === undefined) // If it's not a range slider
				labelDiv.textContent = self.generateTooltipLabel(self.rightValue);
			else
				labelDiv.textContent = self.generateTooltipLabel(self.leftValue, self.rightValue);
		}

		// _____________________________________________________________________________________ \\

	} // end of renderTooltip() function

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

					// Draw the mouseAt indicator
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

	// Returns the requested slider handle
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

	/**
	*	When the user clicks anywhere on the widget, a closest handle is found and set to that position.
	*	Further mouse events are delegated to that handle.
	*/
	function setClickListener(self) {
		var rightHandle = getHandle(self, 'right');

		self.widget.addEventListener('mousedown', function(event) {
			if (self.rightHandleMouseDown === false) {

				var mousePosition;

				if (self.leftHandleMouseDown !== undefined) { // If it's a range slider

					var leftHandle  = getHandle(self, 'left');

					if (self.leftHandleMouseDown === false) {
						event.preventDefault(); // Prevents selection

						mousePosition = getPositionOnSlider(self, event.clientX, event.clientY);
						
						var closerToRight = checkIfCloserToRight(event.clientX, event.clientY, self);
						
						if (closerToRight && self.rightHandleMouseDown === false) {
							// Simulate mousedown event on the right handle
							simulateMouseDown(rightHandle);
							self.setRightPercent(mousePosition);
						} else if (self.leftHandleMouseDown === false) {
							// Simulate mousedown event on the left handle
							simulateMouseDown(leftHandle);
							self.setLeftPercent(mousePosition);
						}
					}
					
				} else { // There's only the right handle
					event.preventDefault(); // Prevents selection
					mousePosition = getPositionOnSlider(self, event.clientX, event.clientY);
					simulateMouseDown(rightHandle);
					self.setRightPercent(mousePosition);
				}
			}
		});

		function simulateMouseDown(node) {
			var mouseDownEvt = document.createEvent('MouseEvents');
			mouseDownEvt.initEvent('mousedown', true, true);
			node.dispatchEvent(mouseDownEvt);
		}

		// Checks if the mouse position is closer to the right handle 
		function checkIfCloserToRight(mouseX, mouseY, self) {
			var sliderValClassName = 'slider-value';

			if (self.vertical === true)
				sliderValClassName += '-vertical';

			var sliderVal = self.parentDiv.getElementsByClassName(sliderValClassName)[0];

			var isCloser;
			if (self.vertical === true)
				isCloser = (mouseY - sliderVal.offsetTop) < (sliderVal.clientHeight / 2);
			else
				isCloser = (mouseX - sliderVal.offsetLeft) > (sliderVal.clientWidth / 2);
			return isCloser;
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

			// Only 3 significant digits after the decimal point
			perc = perc.toFixed(3);

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
			
			// Only 3 significant digits after the decimal point
			perc = perc.toFixed(3);

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