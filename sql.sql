CREATE TABLE users (
        id serial PRIMARY KEY,
        email text unique NOT NULL,
        password text NOT NULL,
        is_admin boolean default FALSE
    );

INSERT INTO users (email,password,is_admin) VALUES ('daler@gmail.com','admin_1',TRUE);  