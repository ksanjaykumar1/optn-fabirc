const {Context} =require('fabric-contract-api')

class CertificateContext extends Context{

    constructor(){
        super();
    }

    getClientName(){

        const id = this.clientIdentity.getID()
        // console.log(`id: ${id}`)
        // console.log(typeof(id))
        const data = id.split('/')
        const client = data[2].split('=')
        const clientName = client[1].split('::')
        return clientName[0]

    }
}

module.exports = CertificateContext