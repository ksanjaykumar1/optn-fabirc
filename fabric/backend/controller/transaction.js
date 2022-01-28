
const fs = require('fs');
const path = require('path');
const { Wallets, Gateway } = require('fabric-network');

const testNetworkRoot = path.resolve(__dirname, '../../test-network');

const submitTransaction =async(req,res)=>{

    const gateway = new Gateway();
    try{

        
        const wallet = await Wallets.newFileSystemWallet('../wallet');

        const {identityLabel,functionName,chaincodeArgs,chaincodeName,channelName} = req.body

        const orgName = identityLabel.split('@')[1];
        const orgNameWithoutDomain = orgName.split('.')[0];

        let connectionProfile = JSON.parse(fs.readFileSync(
            path.join(testNetworkRoot, 
                'organizations/peerOrganizations', 
                orgName, 
                `/connection-${orgNameWithoutDomain}.json`), 'utf8')
        );

        let connectionOptions = {
            identity: identityLabel,
            wallet: wallet,
            discovery: {enabled: true, asLocalhost: true}
        };

        console.log('Connect to a Hyperledger Fabric gateway.');
        await gateway.connect(connectionProfile, connectionOptions);

        console.log(`Use channel ${channelName}.`);
        const network = await gateway.getNetwork(channelName);

        console.log(`connecting to ${chaincodeName}.`);
        const contract = network.getContract(chaincodeName);

        console.log('Submit ' + functionName + ' transaction.');
        const response = await contract.submitTransaction(functionName, ...chaincodeArgs);
        if (`${response}` !== '') {
            res.status(200).json({msg:`Response from ${functionName}: ${response}`});
        }

    }
    catch (error) {
        res.status(200).json({msg:`Error processing transaction. ${error}`});
        console.log(error.stack);
    } finally {
        console.log('Disconnect from the gateway.');
        gateway.disconnect();
    }

}

module.exports ={
    submitTransaction
}