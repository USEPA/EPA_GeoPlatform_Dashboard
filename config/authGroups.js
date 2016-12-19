//Note might be careful changing this while somebody is running
//downloadGPOusers.js or logging in because it uses this file
var ids = {
    'EPA Region 1': {id: '63641797ea964222bdfb662b21a5fa1c',edgName: 'REG 01'},
    'EPA Region 2': {id: '9670ee274c7745d9b2e71222a3339b61',edgName: 'REG 02'},
    'EPA Region 3': {id: '36dde1194b4a4736814a2c024afcf70e',edgName: 'REG 03'},
    'EPA Region 4': {id: '07b70f9349e8496dadb33ae62702c531',edgName: 'REG 04'},
    'EPA Region 5': {id: 'ed61918064564766a5015e564f2ed68c',edgName: 'REG 05'},
    'EPA Region 6': {id: '270d5591383040478ad2b7d71e032ec0',edgName: 'REG 06'},
    'EPA Region 7': {id: '57f60cb6671a4161bddf195e0dc97a3b',edgName: 'REG 07'},
    'EPA Region 8': {id: '27496423f7af4477acbc968a9b8a5a29',edgName: 'REG 08'},
    'EPA Region 9': {id: 'f1e939185899418b95a1430356962959',edgName: 'REG 09'},
    'EPA Region 10': {id: '23f3a56b40124b70b1e952f800e43bf4',edgName: 'REG 10'},
    'EPA Office of the Administrator (OA)':
        {id: '6c73ad876a534034be72bbeb26244233',edgName: 'OA'},
    'EPA Office of Air and Radiation (OAR)':
        {id: 'b2d3fadb885044e889160915f8c728f8',edgName: 'OAR'},
    'EPA Office of Administration and Resources Management (OARM)':
        {id: '254121a228cb4ad6be11285fe7a65aa8',edgName: 'OARM'},
    'EPA Office of the Chief Financial Officer (OCFO)':
        {id: '084513005d714e0b9ea4c42a4b76d365',edgName: 'OCFO'},
    'EPA Office of Chemical Safety and Pollution Prevention (OCSPP)':
        {id: 'e6fee2e545f845668c0e4e7c2a292e01',edgName: 'OCSPP'},
    'EPA Office of Enforcement and Compliance Assurance (OECA)':
        {id: '56a1a93d7f734b47aef6279ff276e838',edgName: 'OECA'},
    'EPA Office of Environmental Information (OEI)':
        {id: '159786233029482ea2ee041ddd9dffad',edgName: 'OEI'},
    'EPA Office of General Counsel (OGC)':
        {id: 'd15357b248114be792306891b6d3a872',edgName: 'OGC'},
    'EPA Office of Inspector General (OIG)':
        {id: '529dd476969c4f91a64e5000e33d651a',edgName: 'OIG'},
    'EPA Office of International and Tribal Affairs (OITA)':
        {id: '19ddf86df7f044379795a56b7c6cc840',edgName: 'OITA'},
    'EPA Office of Research and Development (ORD)':
        {id: '8744f1d371604943b74ea88bcc3d9602',edgName: 'ORD'},
    'EPA Office of Land and Emergency Management (OLEM)':
        {id: '0119e92ad1a54e76a0451499676a7c73',edgName: 'OLEM'},
    'EPA Office of Water (OW)':
        {id: 'a3508d2ae77d48a4ae160233898512ec',edgName: 'OW'}
//    'GP Dashboard Superuser Group':
//        {id: 'd8c85eae60e942cb99ab641f49012814',edgName: ''},
  };
var names = Object.keys(ids);
module.exports = {ids: ids,names: names};
