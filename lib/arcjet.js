import arcjet, { tokenBucket } from "@arcjet/next"

const aj = arcjet({
    key: process.env.ARCJET_KEY,
    characteristics: ["userId"], //tracks based on clerk userid
    rules:[
        tokenBucket({
            mode: "LIVE",
            refillRate: 10,
            interval: 3600, //hourly
            capacity: 10, // every hour 10 requests
        })
    ]
})

export default aj