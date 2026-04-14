import fastify from "fastify";
import { Pool } from "pg";
import argon2 from "argon2";

const app = fastify()

const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DBNAME,
    port: process.env.PG_PORT
})

app.get("/", async (req, res) => {
    const users = await pool.query(`
        SELECT * FROM users;
        `)
    return res.status(200).send(users.rows)
})

app.get("/users", async (req, res) => {
    try {
        const { page = 1, user_id } = req.query
        
        if (!user_id) {
            return res.status(400).send({
                massage: "user_id kiriting!"
            })
        }

        const adminCheck = await pool.query(`
            SELECT is_admin FROM users WHERE id = $1;`,
            [user_id])

        if (adminCheck.rows.length <= 0) {
            return res.status(404).send({
                massage: "User not found! "
            })
        }

        if (!adminCheck.rows[0].is_admin) {
            return res.status(403).send({
                massage: "only admin users can access this route! "
            })
        }

        const itemsPerPage = 10
        const offset = (page - 1) * itemsPerPage

        const countResult = await pool.query(`SELECT COUNT(*) FROM users;`)
        const totalUsers = parseInt(countResult.rows[0].count)
        const totalPages = Math.ceil(totalUsers / itemsPerPage)

        const users = await pool.query(`
            SELECT id, email, is_admin FROM users 
            ORDER BY id 
            LIMIT $1 OFFSET $2;`,
            [itemsPerPage, offset])

        return res.status(200).send({
            data: users.rows
        })
    } catch (error) {
        return res.status(500).send({
            massage: "Serveer error! "
        })
    }
})

app.post("/signup", async (req, res) => {
    try {
        const { email, password, is_admin = false } = req.body

        if (!email || !password) {
            return res.status(400).send({
                massage: "Hato kiritilgan! "
            })
        }

        const checkemail = await pool.query(`
        SELECT email FROM users where email = $1`,
            [email]);

        if (checkemail.rows.length > 0) {
            return res.status(400).send({
                massage: "This email is already in use! "
            })
        }

        const hash = await argon2.hash(password)

        await pool.query(`
        INSERT INTO users (email,password,is_admin) VALUES ($1,$2,$3);`,
            [email, hash, is_admin])


        return res.status(201).send({ massage: "user created!" })
    } catch (error) {
        return res.status(400).send({ massage: "ERROR singup" })
    }
});

app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).send({
                massage: "Hato kiritildi! "
            })
        }
        const datauser = await pool.query(`
        SELECT password FROM users where email = $1;`,
            [email])

        if (datauser.rows.length <= 0) {
            return res.status(400).send({
                massage: "this user dont exits! "
            })
        }
        try {
            if (await argon2.verify(datauser.rows[0].password, password)) {
                const usercheck = await pool.query(`
                    SELECT email,is_admin FROM users WHERE email = $1;`,
                    [email])
                return res.status(201).send(usercheck.rows)
            } else {
                return res.status(400).send({ massage: "error on password or email! " })
            }
        } catch (err) {
            return res.status(400).send({ massage: "error on password! " })
        }
    } catch (error) {
        return res.status(500).send({ massage: error.massage })
    }

})

app.listen({ port: process.env.API_PORT }, (err, address) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log(`Server working on port: ${address}`)
})
