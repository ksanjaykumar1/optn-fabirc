const {Contract} = require('fabric-contract-api')
const CertificateContext = require('./certificate-context')

const oganObjType= 'Organ';
const tissueObjType='Tissue';
const PatientObjType= 'Patient'
const LabReportObjType='LabReport'
const OrganRequest= 'OrganRequest'
const organStatus = {Processing:1, Open:2,Disposed:3, Transplanted:4}
const organs=['Kidney','Liver','Heart', 'Lungs', 'Pancreas','Intestine']
const tissues=['Cornea','Bones','Skin','Veins','Muscles','Tendons','Ligaments','Cartilage','Heart Valves']
const labReports={Positive:1, Negative:2}
const organType={A:1,B:2,C:3}
const PatientRisk={Low:1, Medium:2,High:3}

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
            status: organStatus.Processing
        }
        const result = await this._keyExists(ctx,compositeKey)
        if(result ){
            throw new Error(`the organ ${organID} already exists`)
        }
        await ctx.stub.putState(compositeKey, Buffer.from(JSON.stringify(organ)))
        console.log(`Organ with id ${compositeKey} added`)
        return organ
    }

    async addOrganLabReport(ctx,organName,id,opo,report, organType){

        const compositeKey = ctx.stub.createCompositeKey(organName,[opo,id])
        const organ= await this._getValue(ctx,compositeKey)
        const clientName = ctx.getClientName()
        //Todo access managment , only authorized lab can add the lab report 

        
        if( parseInt(report) ===1)
        {
            const report = {
                organID: organ.organID,
                status: labReports.Positive,
                organType: parseInt(organType)
            }
            const compositeKeyLabReport= ctx.stub.createCompositeKey(LabReportObjType,[organName, clientName,opo,id]) 
            await ctx.stub.putState(compositeKeyLabReport,Buffer.from(JSON.stringify(report)))
            console.log("organ id"+organ.organID)
            console.log("report id"+organ.reportID)
            organ.reportID=compositeKeyLabReport
            organ.status=organStatus.Open
            await ctx.stub.putState(compositeKey,Buffer.from(JSON.stringify(organ)))
            console.log(`Lab report for oragn with ${compositeKey} added with key ${compositeKeyLabReport}`)
            return organ
        }
        else{
            organ.status = organStatus.Disposed
            const report = {
                organID: organ.organID,
                status: labReports.Negative,
                organType: parseInt(organType)
            }
            const compositeKeyLabReport= ctx.stub.createCompositeKey(LabReportObjType,[organName,clientName,opo,id]) 
            await ctx.stub.putState(compositeKeyLabReport,Buffer.from(JSON.stringify(report)))
            console.log(`Organ with key ${compositeKey} disposed by lab ${clientName}`)
            organ.reportID=compositeKeyLabReport
            await ctx.stub.putState(compositeKey,Buffer.from(JSON.stringify(organ)))
            console.log(`Lab report for oragn with ${compositeKey} added with key ${compositeKeyLabReport}`)
            return organ
        }
        
    }

    // Patient's EHR is sent as a request
    async requestOrgan(ctx, organName, opo,id, patientID, organType, risk){

        console.log("MSP of the client is"+ ctx.clientIdentity.getMSPID())
        if(ctx.clientIdentity.getMSPID()!= "Org1MSP")
        {
            throw new Error('Only hospitals can request organs')
        }
        const compositeKey = ctx.stub.createCompositeKey(organName,[opo,id])
        const organ= await this._getValue(ctx,compositeKey)
        if( organ.status== organStatus.Processing)
        {
            throw new Error('Organ is Not active for request')
        }
        if(organ.status == organStatus.Disposed)
        {
            throw new Error(`The organ is disposed and no longer accepts request`)
        }
        if(organ.status == organStatus.Transplanted){

            throw new Error(`The organ has been sucessfully transplanted and no longer accepts request`)
        }
        
        const labReportKey= organ.reportID
        const labReport= await this._getValue(ctx,labReportKey)

        if(labReport.organType != organType)
        {
            throw new Error(`The organ is not compatible with patient`)
        }
        const compositeKeyRequest = ctx.stub.createCompositeKey(OrganRequest,[organName,PatientObjType,patientID])
        const compositeKeyPatient = ctx.stub.createCompositeKey(PatientObjType,[patientID])
        const request ={
            patientID: compositeKeyPatient,
            organType: organType,
            risk: risk,
            hospital: ctx.getClientName(),
            active: true,
            transplanted:false
        }
        await ctx.stub.putState(compositeKeyRequest, Buffer.from(JSON.stringify(request)))
        return request
    }

    // Picks the patient who gets the organ
    async pickRecipient(ctx,organName,id,opo){

        if(!organsObject[organName])
        {
            throw new Error(`The following organs are accepted: ${organs}. Enter the organ name is this form`)
        }
        const compositeKeyOrgan= ctx.stub.createCompositeKey(organName,[opo,id]) 
        const organ = await this._getValue(ctx,compositeKeyOrgan)
        
        if( organ.status != organStatus.Open){

            throw new Error(`The organ is not available for transplantation`)
        }
        const iteratorPromise = ctx.stub.getStateByPartialCompositeKey(OrganRequest,[organName]) 
        let results =[]
        for await (const res of iteratorPromise){
            const organReq= JSON.parse(res.value.toString())
            if( organReq.status == true && organReq.transplanted == false){

            }
                results.push(organReq)
        }

        console.log(results)
        console.log("the list contains "+results.length+"reqests")
        if( results.length == 0){

            throw new Error(`No request for transplantation has been sent to this organ`)
        }

        // selecting the patient based on the danger level
        let selectedReq = results[0]
        if (selectedReq.risk !=3){

            for ( const i=1;i<results.length;i++)
            {
                if(result[i].risk > selectedReq.risk)
                    selectedReq=result[i]
            }
        }

        organ.status= organStatus.Transplanted
        organ.recepient= selectedReq.patientID
        await ctx.stub.putState(compositeKeyOrgan,Buffer.from(JSON.stringify(organ)))
        return console.log(` The organ with key is ${compositeKeyOrgan} is approved for patient ${selectedReq.patientID}`)
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
        return results
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
        return results
    }

    // function to query lab reports
    async queryLabReport(ctx,organName,labName,opoName,id){

        const compositeKeyLabReport= ctx.stub.createCompositeKey(LabReportObjType,[organName,labName,opoName,id])
        return await this._getValue(ctx,compositeKeyLabReport)
    }

    // function to query organ request
    async queryOrganRequest(ctx,organName,patientID){
        
        const compositeKeyRequest = ctx.stub.createCompositeKey(OrganRequest,[organName,PatientObjType,patientID])
        return await this._getValue(ctx,compositeKeyRequest)
    }

    //function to query request by the organ
    async  queryOrganRequestbyOrgan(ctx,organName){

        if(!organsObject[organName])
        {
            throw new Error(`The following organs are accepted: ${organs}. Enter the organ name is this form`)
        }
        const iteratorPromise = ctx.stub.getStateByPartialCompositeKey(OrganRequest,[organName])
        let results=[]
        for await ( const res of iteratorPromise){
            const req  = JSON.parse(res.value.toString())
                results.push(req)
        }
        return results
    }

    // helper function  which accepts a key and returns true if a key exits with a value 
    async _keyExists(ctx, compositeKey){
        const assetJSON = await ctx.stub.getState(compositeKey);
        return assetJSON && assetJSON.length >0;
    }

    // helper function which accepts key and returns corresponding value value
    async _getValue(ctx, compositeKey)
    {
        const assetBytes = await ctx.stub.getState(compositeKey)
         if( !assetBytes || assetBytes.length === 0)
         {
             throw new Error(`The data with key ${compositeKey} doesn't exist`)
         }

         return JSON.parse(assetBytes.toString())
    }

}

module.exports= Optn;