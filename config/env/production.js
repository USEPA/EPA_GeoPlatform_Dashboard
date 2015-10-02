var mongoDBurl='';
module.exports = {
    AGOLorgID: "cJ9YHowT8TU7DUyn",
    AGOLadminCredentials:
    {username: "",password: ""},
    portal: "https://epa.maps.arcgis.com",
//saveUninitialized:false,resave:false limits resaving of session data that is unchanged or uninitialized
    sessionOptions: {secret:"",saveUninitialized:false,resave:false},
//touchAfter: 24*3600 means only update session one time in 24 hrs instead of every refresh (unless session data is changed of course)
    mongoStoreOption: {url: mongoDBurl,touchAfter: 24 * 3600},
    mongoDBurl: mongoDBurl,
    maxRowLimit: null,
    email:
//setting disabled:true will keep emails from sending
//Not sure exactly how this will be setup so append .disable for now to smtp host to make sure it doesn't hit server til ready
    {smtp:{host:"smtp.rtpnc.epa.gov.disable",port:25,service:null,user: "",password: ""}
      ,admins: "aaron.evans@cgi.com;brett.gaines@cgi.com;dyarnell@innovateteam.com;Hultgren.Torrin@epa.gov",defaultFrom: "egam@epa.gov"
      ,disabled: true}

};