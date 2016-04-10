//Note might be careful changing this while somebody is running downloadGPOusers.js or logging in because it uses this file
var ids = {
    "EPA Region 1":"63641797ea964222bdfb662b21a5fa1c",
    "EPA Region 2":"9670ee274c7745d9b2e71222a3339b61",
    "EPA Region 3":"36dde1194b4a4736814a2c024afcf70e",
    "EPA Region 4":"07b70f9349e8496dadb33ae62702c531",
    "EPA Region 5":"ed61918064564766a5015e564f2ed68c",
    "EPA Region 6":"270d5591383040478ad2b7d71e032ec0",
    "EPA Region 7":"57f60cb6671a4161bddf195e0dc97a3b",
    "EPA Region 8":"27496423f7af4477acbc968a9b8a5a29",
    "EPA Region 9":"f1e939185899418b95a1430356962959",
    "EPA Region 10":"23f3a56b40124b70b1e952f800e43bf4",
    "EPA Office of the Administrator (OA)":"6c73ad876a534034be72bbeb26244233",
    "EPA Office of Air and Radiation (OAR)":"b2d3fadb885044e889160915f8c728f8",
    "EPA Office of Administration and Resources Management (OARM)":"254121a228cb4ad6be11285fe7a65aa8",
    "EPA Office of the Chief Financial Officer (OCFO)":"084513005d714e0b9ea4c42a4b76d365",
    "EPA Office of Chemical Safety and Pollution Prevention (OCSPP)":"e6fee2e545f845668c0e4e7c2a292e01",
    "EPA Office of Enforcement and Compliance Assurance (OECA)":"56a1a93d7f734b47aef6279ff276e838",
    "EPA Office of Environmental Information (OEI)":"159786233029482ea2ee041ddd9dffad",
    "EPA Office of General Counsel (OGC)":"d15357b248114be792306891b6d3a872",
    "EPA Office of Inspector General (OIG)":"529dd476969c4f91a64e5000e33d651a",
    "EPA Office of International and Tribal Affairs (OITA)":"19ddf86df7f044379795a56b7c6cc840",
    "EPA Office of Research and Development (ORD)":"8744f1d371604943b74ea88bcc3d9602",
    "EPA Office of Solid Waste and Emergency Response (OSWER)":"0119e92ad1a54e76a0451499676a7c73",
    "EPA Office of Water (OW)":"a3508d2ae77d48a4ae160233898512ec",
    "GP Dashboard Superuser Group":"d8c85eae60e942cb99ab641f49012814"
  };
var names = Object.keys(ids);
module.exports = {ids:ids,names:names};
