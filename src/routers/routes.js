const express = require('express')
const router = new express.Router()
const Equipment = require('../models/equipment-model')
const Engineer = require('../models/engineer')
const Tasklist = require('../models/tasklist')
const Order = require('../models/orders')
const multer = require('multer')
const cors = require('cors')
const sendMessage = require('../messaging/send_email')
const sendSMS = require('../messaging/send_sms')

//entertain every request
const corsOptions = {
    origin: '*'
}

//end-point for retrieving list of all orders.....
//inserted cors with origin as * before callback function
router.get('/get-orders',cors(corsOptions),async(req,res)=>{
    try{
        const list = await Order.find()
        res.status(200).send(list)
    }
    catch(e){
        res.status(500).send('Server Error')
    }
})


//end-point for adding remarks after completion of order.....
router.patch('/updateorder/:id',cors(corsOptions),async(req,res)=>{
    try{
        const order = await Order.findById(req.params.id)
        order.remarks = req.body.remarks
        order.completed = req.body.completed
        await order.save()
        res.send(order)
    }
    catch(e){
        res.status(404).send()
    }
})

//end-point for getting list of engineers to be used in dropdown list of engineers.....
router.get('/engineers',cors(corsOptions),async (req,res)=>{
    try{
        const list = await Engineer.find()
        res.status(200).send(list)
    }
    catch(e){
        res.status(404).send()
    }
})

//end point for form to be filled by suprintendent......
router.get('/order/:id',cors(corsOptions),async (req,res)=>{
    try{
        const order = await Order.findById(req.params.id)
        await order.populate({
            path:'task',
            populate:{path:'maintenancePlan',
                      populate:'equipment'
        }
        }).execPopulate()
        console.log(order)
        const data = {
            tasklist:order.task.tasks,
            assignmentNumber:order.number,
            equipmentCode:order.task.maintenancePlan.equipment.equipmentCode,
            equipmentName:order.task.maintenancePlan.equipment.description,
            description:order.work,
            location:order.location,
            _id:order._id,
            cycle:order.cycle
        }
        res.status(200).send(data)
    }
    catch(e){
        res.status(404).send()
    }
})

//end-point for form to be filled by engineer after completion of his assignment....
router.get('/compliance/:id',cors(corsOptions),async(req,res)=>{
    try{
        const order = await Order.findById(req.params.id)
        await order.populate({
            path:'task',
            populate:{
                path:'maintenancePlan',
                populate:'equipment'
            }
        }).execPopulate()
        console.log(order)
        const data = {
            tasklist:order.task.tasks,
            assignmentNumber:order.number,
            equipmentCode:order.task.maintenancePlan.equipment.equipmentCode,
            equipmentName:order.task.maintenancePlan.equipment.description,
            description:order.work,
            status:order.status,
            location:order.location,
            _id:order._id,
            cycle:order.cycle
        }
        res.status(200).send(data)
    }
    catch(e){
        res.status(404).send({error:'Could not find the requested resource'})
    }
})


//end-point for custom-generation of an assignment....
router.post('/generateorder',cors(corsOptions),async(req,res)=>{
    try{
        const order  = new Order(req.body)
        await order.save()
        res.status(201).send('Order generated successfully')
    }
    catch(e){
        res.status(500).send({error:'Error generating the object'})
    }
})


//object for upload customization.....
const image = multer({
    limits:{
        fileSize:10000000    //file-size in bytes.....
    },
//to allow only particular files to be uploaded ......    
    fileFilter(req,file,cb){
//match function accepts a regular expression(regex) to match with the filename......        
        if(!file.originalname.match(/\.(jpg|jpeg|png)$/)){
            return cb(new Error('Please upload jpeg,jpg or png files'))
        }
// call the callback to stop filterfunction with true as a sign that correct file is uploaded.       
            cb(undefined,true)
    }
})


//end-point for photo/document uploads..
router.post('/uploadphoto/:id',cors(corsOptions),image.single('workImage'),async (req,res)=>{
    try{
        //uploaded file will be saved in file attribute of request object.....
        const file = req.file
        const order = await Order.findById(req.params.id)
        order.workImage.push(file)
        await order.save()
        res.status(201).send('File uploaded successfully')
    }
    catch(e){
        res.status(415).send({error:'Error uploading the file. Upload only in jpg, jpeg or png format'})
    }
})


//end-point for employee-form submission 
router.post('/submit-form',cors(corsOptions),async(req,res)=>{
        try{
            const body = JSON.parse(req.body)
            const engineer = await Engineer.findOne({
                engineerID:body.engineerID
            })
            console.log(engineer)
            const order = await Order.findById(body.orderId)
            order.remarks =body.additionalRemarks
            order.engineer = engineer._id
            order.status = "assigned"
            await order.save()
            engineer.orders.push(order._id)
            const emailID = engineer.emailID
            const phoneNumber = engineer.phoneNumber
            sendMessage(emailID,'hello','text-here')
            sendSMS(phoneNumber,'text-here')
            res.status(200).send()
        }
        catch(e){
            res.status(500).send(e)
        }
})

router.post('/submit-compliance',cors(corsOptions),async(req,res)=>{
        const order = Order.findById(req.body.orderId)
        order.completed = req.body.completed

        
})


module.exports = router