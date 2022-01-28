'use strict';

const fs = require('fs');
const path = require('path');
const FabricCAServices = require('fabric-ca-client');
const { Wallets, Gateway } = require('fabric-network');

const testNetworkRoot = path.resolve(__dirname, '../../test-network');

const generateAdminWallet = async(req,res)=>{
   
    try {
        console.log(testNetworkRoot)
        const wallet = await Wallets.newFileSystemWallet('../wallet');
        
        const predefinedOrgs = [
            {
                name: 'org1.example.com',
                mspId: 'Org1MSP',
                users: ['Admin', 'User1']
            }, {
                name: 'org2.example.com',
                mspId: 'Org2MSP',
                users: ['Admin', 'User1']
            }
        ];

        for (const org of predefinedOrgs) {
            const credPath = path.join(testNetworkRoot, '/organizations/peerOrganizations/', org.name, '/users');
            
            for (const user of org.users) {
                const mspFolderPath = path.join(credPath, `${user}@${org.name}`, '/msp');
                
                // expecting only one cert file and one key file to be in the directories
                const certFile = path.join(mspFolderPath, '/signcerts/', fs.readdirSync(path.join(mspFolderPath, '/signcerts'))[0]);
                const keyFile = path.join(mspFolderPath, '/keystore/', fs.readdirSync(path.join(mspFolderPath, '/keystore'))[0]);

                const cert = fs.readFileSync(certFile).toString();
                const key = fs.readFileSync(keyFile).toString();

                const identity = {
                    credentials: {
                        certificate: cert,
                        privateKey: key,
                    },
                    mspId: org.mspId,
                    type: 'X.509',
                };

                const identityLabel = `${user}@${org.name}`;
                await wallet.put(identityLabel, identity);
            }
        }
        res.status(200).json({ msg:"Successfully generated admin wallet"})

    } catch (error) {
        console.log(`Error adding to wallet. ${error}`);
        console.log(error.stack);
        res.status(400).json({ msg:"Failed generated admin wallet"})
    }
}
const registerUser = async(req,res)=>{
    try{
        const {enrollmentID,registrarLabel,args} = req.body
        const wallet = await Wallets.newFileSystemWallet('../wallet');
        
        let registrarIdentity = await wallet.get(registrarLabel);
        if (!registrarIdentity) {
            console.log(`An identity for the registrar user ${registrarLabel} does not exist in the wallet`);
            console.log('Run the enrollUser.js application before retrying');
            res.status(400).json({ msg:`An identity for the registrar user ${registrarLabel} does not exist in the wallet`})
        }

        const orgName = registrarLabel.split('@')[1];
        const orgNameWithoutDomain = orgName.split('.')[0];

        // Read the connection profile.
        let connectionProfile = JSON.parse(fs.readFileSync(
            path.join(testNetworkRoot, 
                'organizations/peerOrganizations', 
                orgName, 
                `/connection-${orgNameWithoutDomain}.json`), 'utf8')
        );

        // Create a new CA client for interacting with the CA.
        const ca = new FabricCAServices(connectionProfile['certificateAuthorities'][`ca.${orgName}`].url);

        const provider = wallet.getProviderRegistry().getProvider(registrarIdentity.type);
		const registrarUser = await provider.getUserContext(registrarIdentity, registrarLabel);

        // optional parameters
        let optional = {};
        if (args.length > 2) {
            optional = JSON.parse(args[2]);
        }

        // Register the user and return the enrollment secret.
        let registerRequest = {
            enrollmentID: enrollmentID,
            enrollmentSecret: optional.secret || "",
            role: 'client',
            attrs: optional.attrs || []
        };
        const secret = await ca.register(registerRequest, registrarUser);
        return res.status(200).json({ enrollmentID: `${enrollmentID}`, msg: `Successfully registered the user with the ${enrollmentID} enrollment ID and ${secret} enrollment secret.` })
    }
    catch(error){
        res.status(400).json({ msg:`Failed to register user: ${error}`})

    }
}
const enrollUser = async (req,res)=>{
    try{ 
        const {identityLabel,enrollmentID,enrollmentSecret,args} = req.body
        const orgName = identityLabel.split('@')[1];
        const orgNameWithoutDomain = orgName.split('.')[0];

        // Read the connection profile.
        let connectionProfile = JSON.parse(fs.readFileSync(
            path.join(testNetworkRoot, 
                'organizations/peerOrganizations', 
                orgName, 
                `/connection-${orgNameWithoutDomain}.json`), 'utf8')
        );

        // Create a new CA client for interacting with the CA.
        const ca = new FabricCAServices(connectionProfile['certificateAuthorities'][`ca.${orgName}`].url);

        // Create a new FileSystemWallet object for managing identities.
        const wallet = await Wallets.newFileSystemWallet('../wallet');

        // Check to see if we've already enrolled the user.
        let identity = await wallet.get(identityLabel);
        if (identity) {
            console.log(`An identity for the ${identityLabel} user already exists in the wallet`);
            return;
        }
        let enrollmentAttributes = [];
        if (args.length > 3) {
            enrollmentAttributes = JSON.parse(args[3]);
        }

        let enrollmentRequest = {
            enrollmentID: enrollmentID,
            enrollmentSecret: enrollmentSecret,
            attr_reqs: enrollmentAttributes
        };
        const enrollment = await ca.enroll(enrollmentRequest);

        const orgNameCapitalized = orgNameWithoutDomain.charAt(0).toUpperCase() + orgNameWithoutDomain.slice(1);
        identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: `${orgNameCapitalized}MSP`,
            type: 'X.509',
        };

        await wallet.put(identityLabel, identity);
        return res.status(200).json({ msg: `Successfully enrolled ${identityLabel} user and imported it into the wallet` })
    }
    catch(error){
        res.status(400).json({ msg:`Failed to enroll user: ${error}`})

    }
}
const reEnrollUser = async (req,res)=>{
    try{ 
        const {identityLabel,enrollmentID,enrollmentSecret,args} = req.body
        const orgName = identityLabel.split('@')[1];
        const orgNameWithoutDomain = orgName.split('.')[0];

        // Read the connection profile.
        let connectionProfile = JSON.parse(fs.readFileSync(
            path.join(testNetworkRoot, 
                'organizations/peerOrganizations', 
                orgName, 
                `/connection-${orgNameWithoutDomain}.json`), 'utf8')
        );

        // Create a new CA client for interacting with the CA.
        const ca = new FabricCAServices(connectionProfile['certificateAuthorities'][`ca.${orgName}`].url);

        // Create a new FileSystemWallet object for managing identities.
        const wallet = await Wallets.newFileSystemWallet('../wallet');

        // Check to see if we've already enrolled the user.
        let identity = await wallet.get(identityLabel);
        console.log(identity)
        if (!identity) {
            console.log(`An identity for the ${identityLabel} user doesn't exists in the wallet`);
            return;
        }

         // build a user object for authenticating with the CA
         const provider = wallet.getProviderRegistry().getProvider(identity.type);
         const user = await provider.getUserContext(identity);
         console.log(user)

        let enrollmentAttributes = [];
        if (args.length > 3) {
            enrollmentAttributes = JSON.parse(args[3]);
        }
        const enrollment = await ca.reenroll(user,enrollmentAttributes);

        const orgNameCapitalized = orgNameWithoutDomain.charAt(0).toUpperCase() + orgNameWithoutDomain.slice(1);
        identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: `${orgNameCapitalized}MSP`,
            type: 'X.509',
        };

        await wallet.put(identityLabel, identity);
        return res.status(200).json({ msg: `Successfully enrolled ${identityLabel} user and imported it into the wallet` })
    }
    catch(error){
        res.status(400).json({ msg:`Failed to re-enroll user: ${error}`})

    }
}

// revoke by enrollment Id
const revokeUser = async(req,res)=>{
    try{
        const {enrollmentID,registrarLabel,args} = req.body
        const wallet = await Wallets.newFileSystemWallet('../wallet');
        
        let registrarIdentity = await wallet.get(registrarLabel);
        if (!registrarIdentity) {
            console.log(`An identity for the registrar user ${registrarLabel} does not exist in the wallet`);
            console.log('Run the enrollUser.js application before retrying');
            res.status(400).json({ msg:`An identity for the registrar user ${registrarLabel} does not exist in the wallet`})
        }

        const orgName = registrarLabel.split('@')[1];
        const orgNameWithoutDomain = orgName.split('.')[0];

        // Read the connection profile.
        let connectionProfile = JSON.parse(fs.readFileSync(
            path.join(testNetworkRoot, 
                'organizations/peerOrganizations', 
                orgName, 
                `/connection-${orgNameWithoutDomain}.json`), 'utf8')
        );

        // Create a new CA client for interacting with the CA.
        const ca = new FabricCAServices(connectionProfile['certificateAuthorities'][`ca.${orgName}`].url);

        const provider = wallet.getProviderRegistry().getProvider(registrarIdentity.type);
		const registrarUser = await provider.getUserContext(registrarIdentity, registrarLabel);

        // creating revocation request with the enrollment id.
        // revoking with enrollment Id will preventing any future enrollment with the same enrollment id 
        // revoking with enrollment ID, aki and serial will revoke the particular certificate
        let revokeRequest = {
            enrollmentID: enrollmentID,
        };
        const secret = await ca.revoke(revokeRequest, registrarUser);
        return res.status(200).json({ enrollmentID: `${enrollmentID}`, msg: `Successfully revoked the user with the ${enrollmentID} enrollment ID and ${secret} enrollment secret.` })
    }
    catch(error){
        res.status(400).json({ msg:`Failed to revoke user: ${error}`})

    }
}

module.exports ={
    generateAdminWallet,
    registerUser,
    enrollUser,
    reEnrollUser
}