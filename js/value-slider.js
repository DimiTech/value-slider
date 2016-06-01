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

		setEventListeners(this);

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

		// Create a slider value <div> and append it to the container <div>
		var valueSliderDiv = document.createElement('div');
		valueSliderDiv.className = 'slider-value';
		self.widget.appendChild(valueSliderDiv);

		// Create a right handle <div> and append it to the loading line <div>
		var rightHandleDiv = document.createElement('div');
		rightHandleDiv.className = 'slider-handle-right';
		self.widget.children[0].appendChild(rightHandleDiv);
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

	/* -------------------------------------- Event Listeners -------------------------------------- */

	

	function setEventListeners(self) {


		setRightHandleListener(self);

		setGlobalListeners(self);
	}

	function setGlobalListeners(self) {
		
	}

	function setRightHandleListener(self) {

		var rightHandle = self.widget.getElementsByClassName('slider-handle-right')[0];
		self.rightHandleMouseDown = false;

		rightHandle.onmousedown = function(event) {

			self.rightHandleMouseDown = true;

			document.onmouseup   = function(event) { self.rightHandleMouseDown = false; };

			document.onmousemove = function(event) {
				if (self.rightHandleMouseDown) {

					var mousePosition = ~~((event.clientX - self.widget.offsetLeft) * 100 / self.widget.clientWidth + 1);
					if (mousePosition > 100) mousePosition = 100;
					else if (mousePosition < 0) mousePosition = 0;
					self.setValue(mousePosition);
				}
			};
		};



	}

	/* ---------------------------------------- Public API ----------------------------------------- */

	
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

	ValueSlider.prototype.getValue = function() {
		this.getRightValue();
	};

	ValueSlider.prototype.getRightValue = function() {
		return this.rightValue;
	};


	/* ------------------------------------ Public Constructor ------------------------------------- */

	global.ValueSlider = ValueSlider;

})(window);