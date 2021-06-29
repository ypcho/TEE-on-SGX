const fs = require("fs");
const net = require("net");
const crypto = require("crypto");

const { RAState } = require("./sgx_ra");

const RA_config = {
	quote_type: 0x0,
	KDF_ID: 0x1,
	Kpriv: fs.readFileSync("sp_ecdsa_priv.pem"),
	Kpub: fs.readFileSync("sp_ecdsa_pub.pem"),
	ias: {
		url: "https://api.trustedservices.intel.com/",
		path: "/sgx/dev",
		key: JSON.parse(fs.readFileSync("iaskey.json")),
		cert: new crypto.X509Certificate(fs.readFileSync("Intel_SGX_Attestation_RootCA.pem")),
	},
};

const port = 6380;

var firstsock = null;
var firstsockstate = null;

const server = net.createServer({
	// option empty
	},
	function(socket){
		console.log("server connected", "plain socket");

		var state = new RAState(RA_config, 
				function(data){ socket.write(data); }, 
				function(){ console.log("Remote Attestation aborted", state); },
				function(){ console.log("Remote Attestation successful", state); }
			);

		// Debug Log
		if(firstsock === null){
			firstsock = [];
			firststate = state;
			state.loglevel = true;
		} else state.loglevel = false;

		state.nmessage = 0;
		// Debug Log End

		state.buffer = Buffer.alloc(0);

		// assume AUTH command issued and is in RA state
		state.rastep = 1;

		socket.on("data", 
			function(indata){
				// Debug Log
				var messageno = state.nmessage++;

				if(state.loglevel){
					firstsock.push(indata);
					console.log(`message #${messageno} len ${indata.length} :`, indata);
				}
				// Debug Log

				state.handle(indata);
			}
		);

		socket.on("error",
			function(error){
				console.log("error", error);
			}
		);
	}
);

server.listen(port, function(){ console.log(`server listening at port ${port}`); });

////// tls server disabled temporarily
//const tls = require("tls");

//const creds = {
//	key: fs.readFileSync("key.pem"),
//	cert: fs.readFileSync("cert.pem"),
//	
//	// do not reject for testing
//	rejectUnauthorized: false,
//};

//const server = tls.createServer(creds,
//		function(socket){
//			console.log("server connected",
//				socket.authorized ? "authorized" : "unauthorized" 
//				);
//
//			socket.write("Hello World!\n");
//		}
//	);
//
//server.listen(port, function(){ console.log(`server listening at port ${port}`); });

////// express.js abandoned

//var app = express();

// express config
//app.get('/', (req, res) => {
//  res.send('Hello World!')
//})
// express config end

//app.listen(port, () => {
//  console.log(`Example app listening at http://localhost:${port}`)
//})

//var httpServer = http.createServer(app);
//var httpsServer = https.createServer(creds, app);
//
//httpServer.listen(config.port_http);
//httpsServer.listen(config.port_https);