import jwt from "jsonwebtoken"

//middleware to decode jwt to get clerkid

const authUser = async (req, res, next) => {
    try {
        const { token } = req.headers
        if (!token) {
           return res.json({success:false,message:"Not Authorized Login Again"})
        } 
         const token_decode =  jwt.decode(token)
        req.user = { clerkId : token_decode.clerkId }

         next()
       // const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // attach to req, NOT req.body
       // req.user = {
     //       clerkId: decoded.clerkId,
     //   };
     //   next()
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message }); 
    }
}

export default authUser