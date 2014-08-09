// Wrapper around often used Midi functionality to reduce clutter in onMidi:
function MidiData(status, data1, data2) {
	this.status = status;
	this.data1 = data1;
	this.data2 = data2;

	const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

	// Midi Channel:
	this.channel = 								function(){ return (this.status & 0xF); }

	// Booleans for message type:
	this.isNoteOff = 							function(){ return ((this.status & 0xF0) == 0x80) || ((this & 0xF0) == 0x90 && this.data2 == 0); }
	this.isNoteOn = 							function(){ return (this.status & 0xF0) == 0x90; }
	this.isKeyPressure = 					function(){ return (this.status & 0xF0) == 0xA0; }
	this.isChannelController = 		function(){ return (this.status & 0xF0) == 0xB0; }
	this.isProgramChange = 				function(){ return (this.status & 0xF0) == 0xC0; }
	this.isChannelPressure = 			function(){ return (this.status & 0xF0) == 0xD0; }
	this.isPitchBend = 						function(){ return (this.status & 0xF0) == 0xE0; }
	this.isMTCQuarterFrame = 			function(){ return (this.status == 0xF1); }
	this.isSongPositionPointer = 	function(){ return (this.status == 0xF2); }
	this.isSongSelect = 					function(){ return (this.status == 0xF3); }
	this.isTuneRequest = 					function(){ return (this.status == 0xF6); }
	this.isTimingClock = 					function(){ return (this.status == 0xF8); }
	this.isMIDIStart = 						function(){ return (this.status == 0xFA); }
	this.isMIDIContinue = 				function(){ return (this.status == 0xFB); }
	this.isMIDIStop = 						function(){ return (this.status == 0xFC); }
	this.isActiveSensing = 				function(){ return (this.status == 0xFE); }
	this.isSystemReset = 					function(){ return (this.status == 0xFF); }

	this.type = function(){
		var test = this.status & 0xF0;
		switch (test) {
			case 0x80:
				return "NoteOff";
			case 0x90:
				// Note on with Velocity 0 is also considered Note Off:
				if (this.data1 == 0) {
					return "NoteOff";
				}
				else{
					return "NoteOn";
				}
			case 0xA0:
				return "KeyPressure";
			case 0xB0:
				return "CC";
			case 0xC0:
				return "ProgramChange";
			case 0xD0:
				return "ChannelPressure";
			case 0xE0:
				return "PitchBend";
		};
		return "Other";
	}

	// For CCs when used as switches:
	this.isOn =										function(){ return (this.data2 > 64); }
	this.isOff =									function(){ return (this.data2 == 0); }

	// Ranges:
	this.data1IsInRange = 				function(low, high){ return (data1 >= low && data1 <= high); }
	this.data2IsInRange = 				function(low, high){ return (data2 >= low && data2 <= high); }

	// Notes:
	this.note = function(){ return this.isNoteOn() ? noteNames[this.data1 % 12] : false; }
	this.octave = function(){ return this.isNoteOn() ? Math.floor((this.data1 / 12)-2) : false;}
	this.noteOctave = function(){ return this.isNoteOn() ? (this.note() + " " + this.octave()) : false; }
	return this;
} // End MidiData



// A function to set the Note Table for Midi Inputs and add / subtrackt an Offset to Transpose:
function setNoteTable(midiIn, table, offset) {
  for (var i = 0; i < 128; i++)
	{
		table[i] = offset + i;
		// If the result is out of the MIDI Note Range, set it to -1 so the Note is not played:
		if (table[i] < 0 || table[i] > 127) {
			table[i] = -1;
		}
	}
	// Finally set the Key Translation Table of the respective MidiIn:
	midiIn.setKeyTranslationTable(table);
} // End setNoteTable.

function printObject(object){
	var x;
	for(x in Object){
		println(x);
	}
}
