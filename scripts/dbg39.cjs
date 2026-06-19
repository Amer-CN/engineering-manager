const c = require("fs").readFileSync("EngineeringManager.Api/Endpoints/PartnerEndpoints.cs", "utf8")
const start3 = c.indexOf("        app.MapDelete(\"/api/partners/{id}\"")
const semi3 = c.indexOf(";", start3)
console.log("start3:", start3, "first ;:", semi3, "dist:", semi3 - start3)