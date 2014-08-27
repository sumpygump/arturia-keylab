// Controller Script for the Arturia KeyLab 88

loadAPI(1);

load ("Extensions.js");
load ("KeyLab.js");

DRUMPADS = true;
CNAME = "KeyLab 88";

host.defineController("Arturia", "KeyLab 88", "1.0", "6e2e3140-2e06-11e4-8c21-0800200c9a66");
host.defineMidiPorts(1, 1);
host.addDeviceNameBasedDiscoveryPair(["KeyLab 88"], ["KeyLab 88"]);
host.defineSysexIdentityReply("F0 7E 00 06 02 00 20 6B ?? ?? 05 48 ?? ?? ?? ?? F7");
