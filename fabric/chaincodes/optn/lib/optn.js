const {Contract} = require('fabric-contract-api')

const oganObjType= 'Organ';
const tissueObjType='Tissue';
const PatientObjType= 'Patient'
const ReqStatus = {Open:1, Closed:2, Withdraw:3}
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

    async initLedger(ctx)
    {
        console.log('chaincode initialized')
        console.log('The accepted organ are ' +organs)
        console.log('The accepted tissue are ' +tissues)
    }

    

    // async addOrgan(ctx, organName,){

    //     let organ ={
    //         id: organID,
    //         hospital: hospital,
    //         donorID: donorID,
    //         time:time,
    //         status: ReqStatus.Open
    //     }

    // }

    // async addOrganLabReports(ctx){

    // }

    // async requestOrgan(ctx){

    // }

    // async decidePatient(ctx){

    // }


}

module.exports= Optn;