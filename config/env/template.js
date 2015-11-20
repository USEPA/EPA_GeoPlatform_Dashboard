//Enter the url of the mongo DB 
var mongoDBurl='mongodb://localhost:27017/egam';
module.exports = {
    AGOLorgID: "cJ9YHowT8TU7DUyn",
    AGOLadminCredentials:
    {username: "",password: "",appID:"",appSecretDisable:"",expiration:1440},
    portal: "https://epa.maps.arcgis.com",
//saveUninitialized:false,resave:false limits resaving of session data that is unchanged or uninitialized
//Enter any string for secret, something somebody would never guess
    sessionOptions: {secret:"",saveUninitialized:false,resave:false},
//touchAfter: 24*3600 means only update session one time in 24 hrs instead of every refresh (unless session data is changed of course)
    mongoStoreOption: {url: mongoDBurl,touchAfter: 24 * 3600},
    mongoDBurl: mongoDBurl,
    maxRowLimit: null,
    email:
//setting disabled:true will keep emails from sending
//Not sure exactly how this will be setup so append .disable for now to smtp host to make sure it doesn't hit server til ready
//Can set to use a service like gmail by using {host:null,service:"gmail"}
    {smtp:{host:"smtp.rtpnc.epa.gov.disable",port:25,service:null,user: "",password: ""}
      ,admins: "aaron.evans@cgi.com;brett.gaines@cgi.com;dyarnell@innovateteam.com;Hultgren.Torrin@epa.gov",defaultFrom: "egam@epa.gov"
      ,disabled: true},
    superUserGroup: "",
    maxRowLimit:null
};