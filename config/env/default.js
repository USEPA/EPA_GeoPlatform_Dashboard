//Enter the url of the mongo DB 
var mongoDBurl='mongodb://localhost:27017/egam';

var urlFactory = function (obj) {
  obj.baseURLnoPort = function () {return obj.protocol + '://' + obj.name};
  obj.baseURL = function () {return obj.baseURLnoPort() + ':' + obj.port };
  obj.opsBaseURL = function () {return obj.baseURLnoPort() + ':' + obj.opsPort };
  return obj;
};

module.exports = {
    url: {
      internal: urlFactory({
        protocol: 'http',
        name:'localhost',
        port:3000,
        opsPort:3001
      }),
      external: urlFactory({
        protocol: 'http',
        name:'localhost',
        port:80,
        opsPort:80
      })
    },
    AGOLorgID: 'cJ9YHowT8TU7DUyn',
    AGOLadminCredentials:
    {username: '',password: '',appID:'',appSecretDisable:'',expiration:1440},
    portal: 'https://epa.maps.arcgis.com',
    AGOLexternalUserRoleID: 'jmc1ObdWfBTH6NAN',
//saveUninitialized:false,resave:false limits resaving of session data that is unchanged or uninitialized
//Enter any string for secret, something somebody would never guess
    sessionOptions: {secret:'',saveUninitialized:false,resave:false},
//touchAfter: 24*3600 means only update session one time in 24 hrs instead of every refresh (unless session data is changed of course)
    mongoStoreOption: {url: mongoDBurl,touchAfter: 24 * 3600},
    mongoDBurl: mongoDBurl,
    maxRowLimit: null,
    email:
//setting disabled:true will keep emails from sending
//Can set to use a service like gmail by using {host:null,service:"gmail"}
    {smtp:{host:'smtp.rtpnc.epa.gov.disable',port:25,service:null,user: '',password: ''}
      ,admins: 'aaron.evans@cgi.com;brett.gaines@cgi.com;bryan.chastain@cgi.com;dyarnell@innovateteam.com;Hultgren.Torrin@epa.gov',defaultFrom: 'egam@epa.gov'
      ,disabled: true},
    superUserGroup: 'GP Dashboard Superuser Group',
    opsUsers: ['aaron.evans_EPA','thultgre_EPA','dyarnell_EPA','Chastain.Bryan_EPA'],
    scripts:
    {downloadGPOdata:
    {onlyGetMetaData:true}},
    //Primary backup location for mongodump
    backupPath: '../backup',
    //Secondary backup for copying contents of primary backup to secondary
    //location. Really only needed for production.
    secondaryBackupPath: ''
};