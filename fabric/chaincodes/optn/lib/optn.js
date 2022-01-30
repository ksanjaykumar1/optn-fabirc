const {Contract} = require('fabric-contract-api')
const CertificateContext = require('./certificate-context')

const oganObjType= 'Organ';
const tissueObjType='Tissue';
const PatientObjType= 'Patient'
const organStatus = {Open:1, Accepted:2,Disposed:3, Transplanted:4}
const organs=['Kidney','Liver','Heart', 'Lungs', 'Pancreas','Intestine']
const tissues=['Cornea','Bones','Skin','Veins','Muscles','Tendons','Ligaments','Cartilage','Heart Valves']

function toObject(arr){
    var obj= {};
    for( var i=0; i< arr.length; i++)
        obj[arr[i]]=arr[i]
    
    return obj;
}

const organsObject= toObject(organs)
const tissuesObject = toObject(tissues)

class Optn extends Contract{

    createContext(){

        return new CertificateContext();

    }
    async initLedger()
    {
        console.log('chaincode initialized')
        console.log('The accepted organ are ' +organs)
        console.log('The accepted tissue are ' +tissues)
    }

    async addOrgan(ctx, id, organName, donorID, time){

        if(!organsObject[organName])
        {
            throw new Error(`The following organs are accepted: ${organs}. Enter the organ name is this form`)
        }
        const opo = ctx.getClientName()
        console.log(opo)

        const organID = ctx.stub.createCompositeKey(opo,[id])
        const compositeKey = ctx.stub.createCompositeKey(organName,[opo,id])
        
        let organ ={
            organID: organID,
            opo: opo,
            donorID: donorID,
            organName:organName,
            time:time,
            status: organStatus.Open
        }
        const result = await this._keyExists(ctx,compositeKey)
        if(result ){
            throw new Error(`the organ ${organID} already exists`)
        }
        await ctx.stub.putState(compositeKey, JSON.stringify(organ))
        // await ctx.stub.putState(organID,JSON.stringify(organ))
        console.log(`Organ with id ${compositeKey} added`)
        return organ
    }

   

    async queryOrgan(ctx, organName,id, opo){

        const compositeKey = ctx.stub.createCompositeKey(organName,[opo,id])
        const organ= await ctx.stub.getState(compositeKey)
        if(organ && organ.length >0)
        {
            return JSON.parse(organ.toString());
        }
        throw new Error(`Organ with ${compositeKey} doesn't exist`)

    }

    async queryOrgansWithOrganName(ctx, organName){

        if(!organsObject[organName])
        {
            throw new Error(`The following organs are accepted: ${organs}. Enter the organ name is this form`)
        }
        const iteratorPromise = ctx.stub.getStateByPartialCompositeKey(organName,[])
        let results =[]
        for await ( const res of iteratorPromise){
            const organ  = JSON.parse(res.value.toString())
            results.push(organ)
        }
        return JSON.stringify(results)
    }

    async queryOrgansWithOrganNameAndStatus(ctx, organName,status){

        if(!organsObject[organName])
        {
            throw new Error(`The following organs are accepted: ${organs}. Enter the organ name is this form`)
        }
        const iteratorPromise = ctx.stub.getStateByPartialCompositeKey(organName,[])
        let results =[]
        for await ( const res of iteratorPromise){
            const organ  = JSON.parse(res.value.toString())
            if (organ.status === status){
                results.push(organ)
            }
                
        }
        return JSON.stringify(results)
    }

    // helper function  which accepts a key and returns true if a key exits with a value 
    async _keyExists(ctx, compositeKey){
        const assetJSON = await ctx.stub.getState(compositeKey);
        return assetJSON && assetJSON.length >0;
    }

}

module.exports= Optn;