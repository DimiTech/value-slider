(function(global) {

	"use strict";

	/**
	*	Widget constructor
	*
	*	@class ValueSlider
	*	@classdesc Creates a new "value slider" widget inside the given <div> element
	*
	*	@param {Object} options - Options for initializing the component
	*	@param {Object} options.div - The div element which will contain the widget
	*	@param {Number} options.value - Value of the single handle
	*	@param {Number} options.rightValue - Value of the right handle
	*	@param {Number} options.leftValue - Value of the left handle
	*
	*/
	var ValueSlider = function(options) {

		setParentDiv(this, options.div);
		
		createWidget(this);

		this.setValue(options.value || 0); // Short-circuit evaluate the value value

		setMinMaxAndStep(this, options.minValue || 0, 
							   options.maxValue || 100, 
							   options.step     || 1   );

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
		self.widget.className = 'value-slider-container'; 
		self.parentElement.appendChild(self.widget);

		// Hide the widget until it's fully loaded
		self.hide();

		// Create a slider value <div> and append it to the container <div>
		var valueSliderDiv = document.createElement('div');
		valueSliderDiv.className = 'slider-value';
		self.widget.appendChild(valueSliderDiv);

		// Create a right handle <div> and append it to the loading line <div>
		var rightHandleDiv = document.createElement('div');
		rightHandleDiv.className = 'slider-handle-right';
		self.widget.children[0].appendChild(rightHandleDiv);
	}

	function setMinMaxAndStep(self, min, max, step) {
		self.minValue = min;
		self.maxValue = max;
		self.step = step;
	}


	function renderValue(self) {
		var valueSliderDiv = self.widget.children[0];
		valueSliderDiv.style.width = self.rightValue + '%';
	}

	
	// Checks and cleans slider values
	function cleanValue(value, funct) {
		if (typeof value === 'number') {
			value = ~~ value; // Cast to int
			// if (value < -100)
			// 	value = -100;
			// else if (value > 100)
			// 	value = 100;
		} else 
			throw new Error(funct + ' expects a number parameter! (a value from 0 to 100)');
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

					// work on top of this
					var mousePosition = getPositionOnSlider(self, event.clientX);

					mousePosition = clipMousePos(mousePosition);
					// work on top of this
				
					self.setValue(mousePosition);
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
		var mousePosition = ~~((clientX - self.widget.offsetLeft) * 100 / self.widget.clientWidth + 0.5);
		return mousePosition;
	}

	// Clip the mouse position on the slider
	function clipMousePos(mousePos) {
		if (mousePos > 100) mousePos = 100;
		else if (mousePos < 0) mousePos = 0;
		return mousePos;
	}

	function setClickListener(self) {
		var rightHandle = self.widget.getElementsByClassName('slider-handle-right')[0];

		self.widget.onmousedown = function(event) {
			if (self.rightHandleMouseDown === false) {

				var mousePosition = getPositionOnSlider(self, event.clientX);
				self.setValue(mousePosition);
				
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

	ValueSlider.prototype.setValue = function(value) {
		this.setRightValue(value);
	};

	ValueSlider.prototype.setRightValue = function(value) {
		value = cleanValue(value, 'setValue()');

		// Set the value
		this.rightValue = value;

		// Render the widget		
		renderValue(this);
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