import { Router } from "express";
import dotnet from 'dotenv'
import user from '../helpers/user.js'
import jwt from 'jsonwebtoken'
import chat from "../helpers/chat.js";
import OpenAI from "openai";
import { db } from "../db/connection.js";
import collections from "../db/collections.js";

dotnet.config()

let router = Router()

const CheckUser = async (req, res, next) => {
    jwt.verify(req.cookies?.userToken, process.env.JWT_PRIVATE_KEY, async (err, decoded) => {
        if (decoded) {
            let userData = null

            try {
                userData = await user.checkUserFound(decoded)
            } catch (err) {
                if (err?.notExists) {
                    res.clearCookie('userToken')
                        .status(405).json({
                            status: 405,
                            message: err?.text
                        })
                } else {
                    res.status(500).json({
                        status: 500,
                        message: err
                    })
                }
            } finally {
                if (userData) {
                    req.body.userId = userData._id
                    next()
                }
            }

        } else {
            res.status(405).json({
                status: 405,
                message: 'Not Logged'
            })
        }
    })
}

const client = new OpenAI({ apiKey: "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" });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.get('/', (req, res) => {
    res.send("Welcome to chatGPT api v1")
})

router.post('/', CheckUser, async (req, res) => {
    const { prompt, file_id, userId } = req.body
    const messages = [{
        "role": "assistant",
        "content": prompt,

    }]
    console.log(req.body)
    let response = {}
    try {
        // Creating Assistant on OpenAI and giving it file_id
        console.log("POST is being called")
        if (file_id) {
            console.log("Assistant running")
            const assistant = await client.beta.assistants.create({
                name: "GE CoPilot",
                instructions: "You are a helpful and that answers what is asked. Retrieve the relevant information from the files.",
                tools: [{ type: "retrieval" }],
                model: "gpt-3.5-turbo",
                file_ids: [file_id]
            });
            const thread = await client.beta.threads.create({
                messages: [
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ]
            });
            const run = await client.beta.threads.runs.create(
                thread.id,
                { assistant_id: assistant.id }
            );
            let final_run = "";
            while (final_run.status !== "completed") {
                final_run = await client.beta.threads.runs.retrieve(
                    thread.id,
                    run.id
                );
            }
            console.log(final_run.status)
            const messages = await client.beta.threads.messages.list(
                thread.id
            );
            console.log(messages.data[0].content[0].text.value)
            const response = { openai: messages.data[0].content[0].text.value }
            if (response.openai) {
                let index = 0
                for (let c of response['openai']) {
                    if (index <= 1) {
                        if (c == '\n') {
                            response.openai = response.openai.slice(1, response.openai.length)
                        }
                    } else {
                        break;
                    }
                    index++
                }
                response.db = await chat.newResponse(prompt, response, userId, file_id, thread.id)
            }

        }
        else {
            // If no file_id is given 
            response.openai = await openai.chat.completions.create({
                model: "gpt-4-0125-preview",
                messages: [{
                    "role": "system",
                    "content": "You are a helpful and that answers what is asked. Dont show the mathematical steps if not asked."
                }, {
                    "role": "user",
                    "content": prompt
                }],
                "top_p": 0.5,
            });
            if (response.openai.choices[0].message) {
                response.openai = response.openai.choices[0].message.content
                let index = 0
                console.log(response)
                for (let c of response['openai']) {
                    if (index <= 1) {
                        if (c == '\n') {
                            response.openai = response.openai.slice(1, response.openai.length)
                        }
                    } else {
                        break;
                    }
                    index++
                }
                response.db = await chat.newResponse(prompt, response, userId, file_id, null)
                //console.log(response.db)
            }
        }
    } catch (err) {
        console.log(err)
        res.status(500).json({
            status: 500,
            message: err
        })
    } finally {
        if (response?.db && response?.openai) {
            res.status(200).json({
                status: 200,
                message: 'Success',
                data: {
                    _id: response.db['chatId'],
                    content: response.openai
                }
            })
        }
    }
})

router.put('/', CheckUser, async (req, res) => {
    const { prompt, userId, chatId, file_id , thread_id} = req.body
    let mes = {
        "role": "system",
        "content": "You are a helpful and that answers what is asked. Dont show the mathematical steps if not asked.",
    }
    let full = "";
    let message = await chat.Messages(userId, chatId)
    message = message[0].chats
    mes = [mes, ...message]
    mes = [...mes, {
        role: "user",
        content: prompt
    }]
    let response = {}
    try {
        if (file_id) {
            console.log("Assistant running")
            const assistant = await client.beta.assistants.create({
                name: "GE CoPilot",
                instructions: "You are a helpful and that answers what is asked. Retrieve the relevant information from the files.",
                tools: [{ type: "retrieval" }],
                model: "gpt-3.5-turbo",
                file_ids: [file_id]
            });
            const thread = await client.beta.threads.create({
                messages: mes
            });
            const run = await client.beta.threads.runs.create(
                thread.id,
                { assistant_id: assistant.id }
            );
            let final_run = "";
            while (final_run.status !== "completed") {
                final_run = await client.beta.threads.runs.retrieve(
                    thread.id,
                    run.id
                );
            }
            console.log(final_run.status)
            const messages = await client.beta.threads.messages.list(
                thread.id
            );
            console.log(messages.data[0].content[0].text.value)
            const response = { openai: messages.data[0].content[0].text.value }
            if (response.openai) {
                let index = 0
                for (let c of response['openai']) {
                    if (index <= 1) {
                        if (c == '\n') {
                            response.openai = response.openai.slice(1, response.openai.length)
                        }
                    } else {
                        break;
                    }
                    index++
                }
                response.db = await chat.Response(prompt, response, userId, file_id, file_id)
            }
        }
        else {
            response.openai = await openai.chat.completions.create({
                model: "gpt-4-0125-preview",
                messages: mes,
                temperature: 0.68,
                max_tokens: 256,
                top_p: 0.52,
                frequency_penalty: 0,
                presence_penalty: 0,
                stream: true
            });
            for await (const part of response.openai) {
                let text = part.choices[0].delta.content ?? ""
                full += text
            }
            response.openai = {
                role: "assistant",
                content: full
            };
            //response.openai = response.openai.choices[0].message;
            if (response.openai) {
                response.openai = response.openai.content
                console.log(response.openai)
                let index = 0
                //  console.log(response['openai'])
                for (let c of response['openai']) {
                    if (index <= 1) {
                        if (c == '\n') {
                            response.openai = response.openai.slice(1, response.openai.length)
                        }
                    } else {
                        break;
                    }
                    index++
                }

                response.db = await chat.Response(prompt, response, userId, chatId, file_id)
            }
        }

    } catch (err) {
        res.status(500).json({
            status: 500,
            message: err
        })
    } finally {
        if (response?.db && response?.openai) {
            res.status(200).json({
                status: 200,
                message: 'Success',
                data: {
                    content: response.openai,
                    chatId: response.db.chatId
                }
            })
        }
    }
})

router.get('/saved', CheckUser, async (req, res) => {
    const { userId } = req.body
    const { chatId = null } = req.query

    let response = null

    try {
        response = await chat.getChat(userId, chatId)
    } catch (err) {
        if (err?.status === 404) {
            res.status(404).json({
                status: 404,
                message: 'Not found'
            })
        } else {
            res.status(500).json({
                status: 500,
                message: err
            })
        }
    } finally {
        if (response) {
            res.status(200).json({
                status: 200,
                message: 'Success',
                data: response
            })
        }
    }
})

router.get('/history', CheckUser, async (req, res) => {
    const { userId } = req.body

    let response = null

    try {
        response = await chat.getHistory(userId)
    } catch (err) {
        res.status(500).json({
            status: 500,
            message: err
        })
    } finally {
        if (response) {
            res.status(200).json({
                status: 200,
                message: "Success",
                data: response
            })
        }
    }
})

router.delete('/all', CheckUser, async (req, res) => {
    const { userId } = req.body

    let response = null

    try {
        response = await chat.deleteAllChat(userId)
    } catch (err) {
        res.status(500).json({
            status: 500,
            message: err
        })
    } finally {
        if (response) {
            res.status(200).json({
                status: 200,
                message: 'Success'
            })
        }
    }
})

export default router