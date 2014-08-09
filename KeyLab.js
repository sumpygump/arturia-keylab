load ("Extensions.js");
load ("KeyLabInit.js");

var kL = null;

// Main KeyLab Object:
function KeyLab(){
   // Midi Ports:
   //this.midiInKeys = host.getMidiInPort(0).createNoteInput(CNAME + ": Keys", "?0????");
   this.midiInKeys = host.getMidiInPort(0).createNoteInput(CNAME + ": Keys", "80????", "90????", "B001??", "C0????", "D0????", "E0????");
   // Disable the consuming of events by the NoteInputs, so they are also sent to onMidi:
   this.midiInKeys.setShouldConsumeEvents(false);

   // Check if Drumpads are available for the model, if yes, create an Input for them:
   if (DRUMPADS) {
      this.midiInPads = host.getMidiInPort(0).createNoteInput(CNAME + ": Pads", "?9????");
      this.midiInPads.setShouldConsumeEvents(false);
      // Translate Poly AT to Timbre:
      this.midiInPads.assignPolyphonicAftertouchToExpression(9, NoteExpression.TIMBRE_UP, 2);
   }

   // Setting Callbacks for Midi and Sysex
   host.getMidiInPort(0).setMidiCallback(onMidi);
   host.getMidiInPort(0).setSysexCallback(onSysex);

   // Internal IDs used in sysex messages
   this.sysexIDknobBank1 = [1, 2, 3, 4, 9, 5, 6, 7, 8, 0x6e];
   this.sysexIDknobBank2 = [0x21, 0x22, 0x23, 0x24, 0x29, 0x25, 0x26, 0x27, 0x28, 0x2a];
   this.sysexIDbuttonBank = ["63", "64", "65", "66", "67", "68", "69", "6A", "6B", "62"];

   // Constant CC Definitions:
   this.knobBank1 = [74, 71, 76, 77, 93, 18, 19, 16, 17, 91];
   this.knobBank2 = [35, 36, 37, 38, 39, 40, 41, 42, 43, 44];

   this.faderBank1 = [73, 75, 79, 72, 80, 81, 82, 83, 85];
   this.faderBank2 = [67, 68, 69, 70, 87, 88, 89, 90, 92];
   // Normal Button Presses are linear mapped:
   this.lowestButton = 22;
   // Long Press on the Button:
   this.buttonBankL = [104, 105, 106, 107, 108, 109, 110, 111, 116, 117];
   // Bank 1 + 2:
   this.bank1 = 47;
   this.bank2 = 46;
   this.bankToggle = false;
   // Sound, Multi Buttons:
   this.sound = 118;
   this.multi = 119;
   // Sound/Multi Toggle:
   this.soundMulti = false;
   // Main Page Variable:
   this.controllerPage = 0;
   // Selected Button:
   this.pageSelect = 0;
   // Param + Value Encoders:
   this.param = 112;
   this.paramClick = 113;
   this.paramIsClicked = false;
   this.value = 114;
   this.valueClick = 115;
   this.valueIsClicked = false;
   // Volume:
   this.volume = 7;
   // Pads:
   this.lowestPad = 36;

   // Transport:
   this.loopToggle = 55;

   // Observer Values:
   this.masterVolume = 0;
   this.trackVolume = [];
   this.deviceMacro = [];
   this.deviceMapping = [];
   this.pageNames = [];
   // "HasChanged" & Accumulators
   this.deviceHasChanged = false;
   this.pPageHasChanged = false;
   this.presetHasChanged = false;
   this.presetCategoryHasChanged = false;
   this.presetCreatorHasChanged = false;
   this.trackHasChanged = false;
   this.positionHasChanged = false;
   this.punchInHasChanged = false;
   this.punchOutHasChanged = false;
   this.playHasChanged = false;
   this.recordHasChanged = false;
   this.loopHasChanged = false;

   this.trackAccumulator = 0;
   this.trackBankAccumulator = 0;
   this.deviceAccumulator = 0;

   // Initialisations:
   for (var i = 0; i < 8; i++) {
      this.trackVolume[i] = 0;
      this.deviceMacro[i] = 0;
      this.deviceMapping[i] = 0;
   }

   // Pad Translation Table:
   this.padTranslation = initArray(0, 128);
   this.padOffset = 0;

   // Creating Main Views:
   this.application = host.createApplication();
   this.transport = host.createTransport();
   this.masterTrack = host.createMasterTrack(0);
   this.tracks = host.createMainTrackBank(8, 0, 0);
   this.cTrack = host.createCursorTrack(3, 0);
   //this.cDevice = host.createCursorDevice();
   this.cDevice = this.cTrack.getPrimaryDevice();
   this.uMap = host.createUserControls(8);

   this.masterTrack.getVolume().addValueObserver(128, function(volume){
      this.masterVolume = volume;
   });

   // Device Mapping Pages:
   this.cDevice.addPageNamesObserver(function(names)
   {
      this.pageNames = [];
      for(var j=0; j<arguments.length; j++) {
         this.pageNames[j] = arguments[j];
      }
   });
   this.cDevice.addSelectedPageObserver(0, function(on)
   {
      if(this.pPageHasChanged) {
         host.showPopupNotification(this.pageNames[on]);
         sendTextToKeyLab("Parameter Page:", this.pageNames[on]);
         this.pPageHasChanged = false;
      }
   });
   this.cDevice.addNameObserver(16, "None", function(name){
      if (this.deviceHasChanged) {
         sendTextToKeyLab("Current Device:", name);
      }
   });
   this.cDevice.addPresetNameObserver(16, "None", function(name){
      if (this.presetHasChanged) {
         sendTextToKeyLab("Current Preset:", name);
         this.presetHasChanged = false;
      }
   });
   this.cDevice.addPresetCategoryObserver(16, "None", function(name){
      if (this.presetCategoryHasChanged) {
         sendTextToKeyLab("Preset Category:", name);
         this.presetCategoryHasChanged = false;
      }
   });
   this.cDevice.addPresetCreatorObserver(16, "None", function(name){
      if (this.presetCreatorHasChanged) {
         sendTextToKeyLab("Preset Creator:", name);
         this.presetCreatorHasChanged = false;
      }
   });

   this.transport.addIsLoopActiveObserver(function(on){
      if (this.loopHasChanged) {
      if (on) {
         sendTextToKeyLab("Transport:", "Loop Enabled");
      }
      else{
         sendTextToKeyLab("Transport:", "Loop Disabled");
      }
      }
   });
   this.transport.addIsPlayingObserver(function(on){
      if (this.playHasChanged) {
      if (on) {
         this.isPlaying = true;
         sendTextToKeyLab("Transport:", "Play");
      }
      else{
         this.isPlaying = false;
         sendTextToKeyLab("Transport:", "Pause");
      }
      }
   });
   this.transport.addIsRecordingObserver(function(on){
      if (this.recordHasChanged) {
      if (on) {
         sendTextToKeyLab("Transport:", "Record Enabled");
      }
      else{
         sendTextToKeyLab("Transport:", "Record Disabled");
      }
      }
   });
   this.transport.getPosition().addTimeObserver(":", 4, 1, 1, 2, function(time){
      if (!this.isPlaying && this.positionHasChanged) {
         sendTextToKeyLab("Current Time:", time);
      }
   });
   this.transport.getInPosition().addTimeObserver(":", 4, 1, 1, 2, function(time){
      if (!this.isPlaying && this.punchInHasChanged) {
         sendTextToKeyLab("Punch-In Time:", time);
      }
   });
   this.transport.getOutPosition().addTimeObserver(":", 4, 1, 1, 2, function(time){
      if (!this.isPlaying && this.punchOutHasChanged) {
         sendTextToKeyLab("Punch-Out Time:", time);
      }
   });
   this.cTrack.addNameObserver(16, "None", function(name){
      if (this.trackHasChanged) {
         sendTextToKeyLab("Current Track:", name);
      }
   })

   // Return the object:
   return this;
}

function init(){
   // Instantiate the main KeyLab Object
   kL = KeyLab();
   // Setting the device to a defined state:
  configureDeviceUsingSysex();

   // THIS DOESN'T WORK YET!!! //////////////////////

   // we would like to set the device into bank 1 and sound mode by default, regardless of the current hardware state
   // these IDs doesn't seem to match the documentation though.

   // Press Bank 1 Simulate User Action:
   //sendSysex("F0 00 20 6B 7F 42 0F 7D 0A 1D 7F 00 F7");
   //sendSysex("F0 00 20 6B 7F 42 0F 7D 0A 1D 00 00 F7");
   // Press Bank 1 Set Value:
   //sendSysex("F0 00 20 6B 7F 42 02 00 00 1D 7F F7");
   //sendSysex("F0 00 20 6B 7F 42 02 00 00 1D 00 F7");
   // Press Multi:
   //sendSysex("F0 00 20 6B 7F 42 0F 7D 0A 1F 7F 00 F7");
   //sendSysex("F0 00 20 6B 7F 42 0F 7D 0A 1F 00 00 F7");
   // Press Sound:
   //sendSysex("F0 00 20 6B 7F 42 0F 7D 0A 1E 7F 00 F7");
   //sendSysex("F0 00 20 6B 7F 42 0F 7D 0A 1E 00 00 F7");

   ///////////////////////////////////////////////////


   // LEDs only - Bank doesn't seem to work
   sendSysex("F0 00 20 6B 7F 42 02 00 00 6C 00 F7");  // bank 2
   sendSysex("F0 00 20 6B 7F 42 02 00 00 6D 01 F7");  // bank 1
   sendSysex("F0 00 20 6B 7F 42 02 00 00 6E 01 F7");  // sound
   sendSysex("F0 00 20 6B 7F 42 02 00 00 6F 00 F7");  // multi

   ///////////////////////////////////////////////////

   // Welcome Message on Display:
   sendTextToKeyLab("Arturia & Bitwig", "Let's Groove!");
   setPage();

}

function Mode(label)
{
   this.label = label;
}

Mode.prototype.onParamCategory = function(inc)
{
   if (kL.paramIsClicked)
   {
      kL.presetCreatorHasChanged = true;
      if (inc > 0)
      {
         kL.cDevice.switchToNextPresetCreator();
      }
      else if (inc < 0)
      {
         kL.cDevice.switchToPreviousPresetCreator();
      }
   }
   else
   {
      kL.presetCategoryHasChanged = true;

      if (inc > 0)
      {
         kL.cDevice.switchToNextPresetCategory();
      }
      else
      {
         kL.cDevice.switchToPreviousPresetCategory();
      }
   }
};

Mode.prototype.onParamCategoryClick = function(pressed)
{
};

Mode.prototype.onValuePreset = function(inc)
{
   kL.presetHasChanged = true;
   if (inc > 0)
   {
      kL.cDevice.switchToNextPreset();
   }
   else
   {
      kL.cDevice.switchToPreviousPreset();
   }
};

Mode.prototype.onValuePresetClick = function(pressed)
{
};

Mode.prototype.onVolumeEncoder = function(inc)
{
   kL.cTrack.getVolume().inc(inc, 101);
};

Mode.prototype.onSoundMultiPressed = function(soundOn)
{
};

var ARTURIA_MODE = new Mode("Arturia Mode (CC)");
ARTURIA_MODE.encoderValues = initArray(64, 10);
ARTURIA_MODE.volumeValue = 64;

ARTURIA_MODE.onEncoder = function(index, inc)
{
   var oldVal = this.encoderValues[index];
   var val = Math.max(0, Math.min(127, oldVal + inc));

   if (val != oldVal)
   {
      this.encoderValues[index] = val;
      kL.midiInKeys.sendRawMidiEvent(0xB0, kL.knobBank1[index], val);
   }
};

ARTURIA_MODE.onVolumeEncoder = function(inc)
{
   var oldVal = this.volumeValue;
   var val = Math.max(0, Math.min(127, oldVal + inc));

   if (val != oldVal)
   {
      this.volumeValue = val;
      kL.midiInKeys.sendRawMidiEvent(0xB0, kL.volume, val);
   }
};

ARTURIA_MODE.onFader = function(index, value)
{
   kL.midiInKeys.sendRawMidiEvent(0xB0, kL.faderBank1[index], value);
};

ARTURIA_MODE.onParamCategory = function(inc)
{
   kL.midiInKeys.sendRawMidiEvent(0xB0, kL.param, 64 + inc);
};

ARTURIA_MODE.onParamCategoryClick = function(pressed)
{
   kL.midiInKeys.sendRawMidiEvent(0xB0, kL.paramClick, pressed ? 127 : 0);
};

ARTURIA_MODE.onValuePreset = function(inc)
{
   kL.midiInKeys.sendRawMidiEvent(0xB0, kL.value, 64 + inc);
};

ARTURIA_MODE.onValuePresetClick = function(pressed)
{
   kL.midiInKeys.sendRawMidiEvent(0xB0, kL.valueClick, pressed ? 127 : 0);
};

ARTURIA_MODE.onButtonPress = function(index, pressed)
{
   kL.midiInKeys.sendRawMidiEvent(0xB0, kL.lowestButton + index, pressed ? 127 : 0);
};

ARTURIA_MODE.onSoundMultiPressed = function(soundOn)
{
   kL.midiInKeys.sendRawMidiEvent(0xB0, (soundOn ? kL.sound : kL.multi), 127);
}

var SOUND_MODE = new Mode("Sound Mode");

SOUND_MODE.onEncoder = function(index, inc)
{
   if (index < 4)
   {
      // 0 - 3
      setDeviceValue(index, kL.pageSelect, inc);
   }
   else if (index == 4)
   {
      kL.trackAccumulator += Math.abs(inc);
      if (kL.trackAccumulator > 4)
      {
         kL.trackAccumulator = 0;
         kL.trackHasChanged = true;
         inc < 0 ? kL.cTrack.selectPrevious() : kL.cTrack.selectNext();
      }
   }
   else if (index == 9)
   {
      kL.deviceAccumulator += Math.abs(inc);
      if (kL.deviceAccumulator > 4)
      {
         kL.deviceAccumulator = 0;
         kL.deviceHasChanged = true;

         kL.cDevice.switchToDevice(DeviceType.ANY, inc < 0 ? ChainLocation.PREVIOUS : ChainLocation.NEXT);
      }
   }
   else
   {
      // 5 - 8
      setDeviceValue(index - 1, kL.pageSelect, inc);
   }
};

SOUND_MODE.onFader = function(index, value)
{
   kL.cDevice.getEnvelopeParameter(index).set(value, 128);
};

SOUND_MODE.onButtonPress = function(index, pressed)
{
   if (index == 0)
   {
      // Macros:
      pressed ? kL.pageSelect = 0 : setButtonLight(0);
      setDeviceIndication(true);
      sendTextToKeyLab("Active Control:", "Device Macros")
   }
   else if (index == 1)
   {
      // Common:
      pressed ? kL.pageSelect = 1 : setButtonLight(1);
      setDeviceIndication(true);
      sendTextToKeyLab("Parameter Page:", "Common")
   }
   else
   {
      setParameterButtons(pressed, index);
   }
};

var MULTI_MODE = new Mode("Mix Mode");

MULTI_MODE.onEncoder = function(index, increment)
{
   switch (index)
   {
      case 0:
         kL.cTrack.getPan().inc(increment, 128);
         break;
      case 1:
         kL.cTrack.getSend(0).inc(increment, 128);
         break;
      case 2:
         kL.cTrack.getSend(1).inc(increment, 128);
         break;
      case 3:
         kL.cTrack.getSend(2).inc(increment, 128);
         break;
      case 5:
         kL.positionHasChanged = true;
         kL.transport.incPosition(increment, true);
         break;
      case 6:
         kL.punchInHasChanged = true;
         kL.punchOutHasChanged = false;
         kL.transport.getInPosition().incRaw(increment);
         break;
      case 7:
         kL.punchOutHasChanged = true;
         kL.transport.getOutPosition().incRaw(increment);
         break;
      case 8:
         kL.transport.increaseTempo(increment, 647);
         break;

      case 4:
         // Move the Cursor Track:
         kL.trackAccumulator += Math.abs(increment);
         if (kL.trackAccumulator > 4)
         {
            kL.trackAccumulator = 0;
            kL.trackHasChanged = true;
            increment < 0 ? kL.cTrack.selectPrevious() : kL.cTrack.selectNext();
         }
         break;

      case 9:
         // Move the Track Bank:
         kL.trackBankAccumulator += Math.abs(increment);
         if (kL.trackBankAccumulator > 4)
         {
            kL.trackBankAccumulator = 0;
            increment < 0 ? kL.tracks.scrollTracksUp() : kL.tracks.scrollTracksDown();
         }
         break;
   }
};

MULTI_MODE.onFader = function(index, value)
{
   if (index == 8)
   {
      kL.masterTrack.getVolume().set(value, 128);
   }
   else
   {
      kL.tracks.getTrack(index).getVolume().set(value, 128);
   }
};

MULTI_MODE.onButtonPress = function(index, pressed)
{
   switch(index)
   {
      case 0:
         break;
      case 1:
         if(pressed){kL.application.toggleNoteEditor();}
         break;
      case 2:
         if(pressed){kL.application.toggleAutomationEditor();}
         break;
      case 3:
         if(pressed){kL.application.toggleDevices();}
         break;
      case 4:
         if(pressed){kL.application.toggleMixer();}
         break;
      case 5:
         try {
            if(pressed){kL.application.toggleInspector();}
         } catch(e) {
            println("Placeholder: toggle Inspector in 1.1")
         }
         break;
      case 6:
         if(pressed){kL.application.nextPerspective();}
         break;
      case 7:
         if(pressed){kL.application.toggleBrowserVisibility();}
         break;
      case 8:
         if(kL.padOffset > -3 && pressed){
            kL.padOffset -= 1;
            if (kL.padOffset >= 0) {
               var prefix = " +";
            }
            else{
               var prefix = " "
            }
            setNoteTable(kL.midiInPads, kL.padTranslation, kL.padOffset * 16);
            host.showPopupNotification("Drum Pad Bank:" + prefix + kL.padOffset );
            sendTextToKeyLab("Drum Pad Bank:", prefix + kL.padOffset)
         }
         break;
      case 9:
         if(kL.padOffset < 4 && pressed)
         {
            kL.padOffset += 1;
            if (kL.padOffset >= 0) {
               var prefix = " +";
            }
            else{
               var prefix = " "
            }
            setNoteTable(kL.midiInPads, kL.padTranslation, kL.padOffset * 16);
            host.showPopupNotification("Drum Pad Bank:" + prefix + kL.padOffset );
            sendTextToKeyLab("Drum Pad Bank:", prefix + kL.padOffset)
         }
   }
};

var MODE = null;

function onMidi(status, data1, data2){
   // Instantiate the MidiData Object for convenience:
   var midi = new MidiData(status, data1, data2);
   // Show the Midi Output in the Scripting Console:
   //printMidi(midi.status, midi.data1, midi.data2);

   // Switch over receivced data type:
   switch (midi.type()){
      // handle all CCs:
      case "CC":
         // Handle Stuff independent of Mode First:
         if(midi.data1 == kL.loopToggle){
            kL.loopHasChanged = true;
            transport.toggleLoop();
         }
         else if (midi.data1 == kL.bank1) {
            kL.bankToggle = false;
            setPage();

         }
         else if (midi.data1 == kL.bank2) {
            kL.bankToggle = true;
            setPage();
         }
         else if (midi.data1 == kL.sound) {
            kL.soundMulti = false;
            setPage();
            MODE.onSoundMultiPressed(true);
            sendTextToKeyLab(MODE.label, "");
         }
         else if (midi.data1 == kL.multi) {
            kL.soundMulti = true;
            setPage();
            MODE.onSoundMultiPressed(false);
            sendTextToKeyLab(MODE.label, "");
         }

         var increment = midi.data2 - 64;

         switch (midi.data1)
         {
            // Preset/Category Up/Down:
            case kL.paramClick:
               kL.paramIsClicked = (midi.isOn());
               MODE.onParamCategoryClick(kL.paramIsClicked);
               break;

            case kL.valueClick:
               kL.valueIsClicked = (midi.isOn());
               MODE.onValuePresetClick(kL.valueIsClicked);
               break;

            case kL.param:
               if (increment != 0)
               {
                  MODE.onParamCategory(increment);
               }
               break;

            case kL.value:
               if (increment != 0)
               {
                  MODE.onValuePreset(increment);
               }
               break;
            // Volume Knob:
            case kL.volume:
               MODE.onVolumeEncoder(increment);
               break;

            case kL.knobBank1[0]:
            case kL.knobBank2[0]:
               MODE.onEncoder(0, increment);
               break;
            case kL.knobBank1[1]:
            case kL.knobBank2[1]:
               MODE.onEncoder(1, increment);
               break;
            case kL.knobBank1[2]:
            case kL.knobBank2[2]:
               MODE.onEncoder(2, increment);
               break;
            case kL.knobBank1[3]:
            case kL.knobBank2[3]:
               MODE.onEncoder(3, increment);
               break;
            case kL.knobBank1[4]:
            case kL.knobBank2[4]:
               MODE.onEncoder(4, increment);
               break;
            case kL.knobBank1[5]:
            case kL.knobBank2[5]:
               MODE.onEncoder(5, increment);
               break;
            case kL.knobBank1[6]:
            case kL.knobBank2[6]:
               MODE.onEncoder(6, increment);
               break;
            case kL.knobBank1[7]:
            case kL.knobBank2[7]:
               MODE.onEncoder(7, increment);
               break;
            case kL.knobBank1[8]:
            case kL.knobBank2[8]:
               MODE.onEncoder(8, increment);
               break;
            case kL.knobBank1[9]:
            case kL.knobBank2[9]:
               MODE.onEncoder(9, increment);
               break;

            case kL.faderBank1[0]:
            case kL.faderBank2[0]:
               MODE.onFader(0, midi.data2);
               break;
            case kL.faderBank1[1]:
            case kL.faderBank2[1]:
               MODE.onFader(1, midi.data2);
               break;
            case kL.faderBank1[2]:
            case kL.faderBank2[2]:
               MODE.onFader(2, midi.data2);
               break;
            case kL.faderBank1[3]:
            case kL.faderBank2[3]:
               MODE.onFader(3, midi.data2);
               break;
            case kL.faderBank1[4]:
            case kL.faderBank2[4]:
               MODE.onFader(4, midi.data2);
               break;
            case kL.faderBank1[5]:
            case kL.faderBank2[5]:
               MODE.onFader(5, midi.data2);
               break;
            case kL.faderBank1[6]:
            case kL.faderBank2[6]:
               MODE.onFader(6, midi.data2);
               break;
            case kL.faderBank1[7]:
            case kL.faderBank2[7]:
               MODE.onFader(7, midi.data2);
               break;
            case kL.faderBank1[8]:
            case kL.faderBank2[8]:
               MODE.onFader(8, midi.data2);
               break;


            // Buttons -> Device Mapping Pages
            case kL.lowestButton:
               MODE.onButtonPress(0, midi.isOn());
               break;
            case (kL.lowestButton + 1):
               MODE.onButtonPress(1, midi.isOn());
               break;
            case (kL.lowestButton + 2):
               MODE.onButtonPress(2, midi.isOn());
               break;
            case (kL.lowestButton + 3):
               MODE.onButtonPress(3, midi.isOn());
               break;
            case (kL.lowestButton + 4):
               MODE.onButtonPress(4, midi.isOn());
               break;
            case (kL.lowestButton + 5):
               MODE.onButtonPress(5, midi.isOn());
               break;
            case (kL.lowestButton + 6):
               MODE.onButtonPress(6, midi.isOn());
               break;
            case (kL.lowestButton + 7):
               MODE.onButtonPress(7, midi.isOn());
               break;
            case (kL.lowestButton + 8):
               MODE.onButtonPress(8, midi.isOn());
               break;
            case (kL.lowestButton + 9):
               MODE.onButtonPress(9, midi.isOn());
               break;
         }
         break;
      //case "NoteOn":
      //	 break;
      //case "NoteOff":
      //	 break;
      //case "KeyPressure":
      //	 break;
      //case "ProgramChange":
      //	 break;
      //case "ChannelPressure":
      //	 break;
      //case "PitchBend":
      //	 break;
      //case "Other":
      //	 break
   }
}

function onSysex(data){
   // Show Sysex input in Scripting Console:
   //printSysex(data);
   //println(data);
   switch (data){
      case "f07f7f0605f7":
         kL.transport.rewind();
         sendTextToKeyLab("Transport:", "Rewind");
         break;
      case "f07f7f0604f7":
         kL.transport.fastForward();
         sendTextToKeyLab("Transport:", "Fast Forward");
         break;
      case "f07f7f0601f7":
         kL.transport.stop();
         sendTextToKeyLab("Transport:", "Stop");
         break;
      case "f07f7f0602f7":
         kL.playHasChanged = true;
         kL.transport.play();
         break;
      case "f07f7f0606f7":
         kL.recordHasChanged = true;
         kL.transport.record();
         break;
   }
}

// Set the current page:
function setPage()
{
   var previousMode = MODE;
   if (kL.bankToggle)
   {
      MODE = ARTURIA_MODE;
   }
   else
   {
      if (kL.soundMulti)
      {
         MODE = MULTI_MODE;
      }
      else
      {
         MODE = SOUND_MODE;
      }
   }

   if (previousMode != MODE)
   {
      switch (MODE)
      {
         case SOUND_MODE:
            setDeviceIndication(true);
            setTrackIndication(false);
            setButtonLight(kL.pageSelect);
            break;

         case MULTI_MODE:
            setDeviceIndication(false);
            setTrackIndication(true);
            setButtonLight(-1);
            break;

         case ARTURIA_MODE:
            setDeviceIndication(false);
            setTrackIndication(false);
            setButtonLight(-1);
            break;

      }

      if (previousMode != null)
      {
         host.showPopupNotification(MODE.label);
         //sendTextToKeyLab(MODE.label, "");
      }
   }
}

// Set Device Value based on current page:
function setDeviceValue(index, page, increment){
   switch (page) {
      case 0:
         kL.cDevice.getMacro(index).getAmount().inc(increment, 128);
         break;
      case 1:
         kL.cDevice.getCommonParameter(index).inc(increment, 128);
         break;
      default:
         kL.cDevice.getParameter(index).inc(increment, 128);
         break;
   }
}

// Set up the Buttons for Parameter Page Selection:
function setParameterButtons(isOn, index) {
   if(isOn){
      kL.pageSelect = index;
      try {
         kL.pPageHasChanged = true;
         kL.cDevice.setParameterPage(index - 2);
      } catch(e) {}
      setDeviceIndication(true);
   }
   else{
      setButtonLight(index);
   }
}

// Set the Colour Indication on Devices:
function setDeviceIndication(enabled){
   if (enabled) {
      switch(kL.pageSelect){
      case 0:
         var macro = true;
         var common = false;
         var envelope = true;
         var user = false;
         break;
      case 1:
         var macro = false;
         var common = true;
         var envelope = true;
         var user = false;
         break;
      default:
         var macro = false;
         var common = false;
         var envelope = true;
         var user = true;
         break;
      }
   }
   else{
      var macro = false;
      var common = false;
      var envelope = false;
      var user = false;
   }
   for (var i = 0; i < 8; i++) {
      kL.cDevice.getMacro(i).getAmount().setIndication(macro);
      //kL.cDevice.getEnvelopeParameter(i).setIndication(envelope);
      kL.cDevice.getCommonParameter(i).setIndication(common);
      kL.cDevice.getParameter(i).setIndication(user);
   }
   //kL.cDevice.getEnvelopeParameter(8).setIndication(envelope);
}

// Set the Colour Indication on Tracks, Pan and Sends
function setTrackIndication(enabled){
   for (var i = 0; i < 8; i++){
      kL.tracks.getTrack(i).getVolume().setIndication(enabled);
   }
   // Pan
   kL.cTrack.getPan().setIndication(enabled);
   // Sends
   kL.cTrack.getSend(0).setIndication(enabled);
   kL.cTrack.getSend(1).setIndication(enabled);
   kL.cTrack.getSend(2).setIndication(enabled);
   // Master Track:
   kL.masterTrack.getVolume().setIndication(enabled);
}

// Make the Lights on the Buttons exclusive
function setButtonLight(index){
   for(var i = 0; i < 10; i++){
      var on = (index == i) ? " 01" : " 00";
      sendSysex("F0 00 20 6B 7F 42 02 00 00 " + kL.sysexIDbuttonBank[i] + on + " F7");
   }
}

// Send Text to KeyLab Display:
function sendTextToKeyLab(line1, line2){
   sendSysex("F0 00 20 6B 7F 42 04 00 60 01 " + line1.toHex(16) + " 00 02 " + line2.toHex(16) + " 00 F7");
}

// A function to set the Note Table for Midi Inputs and add / subtract an Offset to Transpose:
function setNoteTable(midiIn, table, offset) {
  for (var i = 0; i < 128; i++)
   {
      table[i] = offset + i;
      // if the result is out of the MIDI Note Range, set it to -1 so the Note is not played:
      if (table[i] < 0 || table[i] > 127) {
         table[i] = -1;
      }
   }
   // finally set the Key Translation Table of the respective MidiIn:
   midiIn.setKeyTranslationTable(table);
}

// Exit Function
function exit(){
   // Reset Working Memory to a default state:
   resetKeyLabToAbsoluteMode();
   //println("Reset Encoders to Absolute");
}
