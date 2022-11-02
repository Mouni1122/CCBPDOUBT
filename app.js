const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const databasePath = path.join(__dirname, "twitterClone.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();
const validatePassword = (password) => {
  return password.length > 6;
};
const convertUserDbObjectToResponseObject = (dbObject) => {
  return {
    userId: dbObject.user_id,
    userName: dbObject.user_name,
    password: dbObject.password,
    name: dbObject.name,
    gender: dbObject.gender,
  };
};
const convertFollowerDbObjectToResponseObject = (dbObject) => {
  return {
    followerId: dbObject.follower_id,
    followerUserId: dbObject.follower_user_id,
    followingUserId: dbObject.following_user_id,
  };
};

const convertTweetDbObjectToResponseObject = (dbObject) => {
  return {
    tweetId: dbObject.tweet_id,
    tweet: dbObject.tweet,
    userId: dbObject.user_id,
    dateTime: dbObject.date_time,
  };
};
const convertReplyDbObjectToResponseObject = (dbObject) => {
  return {
    replyId: dbObject.reply_id,
    tweetId: dbObject.tweet_id,
    reply: dbObject.reply,
    userId: dbObject.user_id,
    dateTime: dbObject.date_time,
  };
};

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

app.post("/register/", async (request, response) => {
  const { username, name, password, gender } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);

  if (databaseUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      user (username, name, password, gender)
     VALUES
      (
       '${username}',
       '${name}',
       '${hashedPassword}',
       '${gender}' 
      );`;
    if (validatePassword(password)) {
      await database.run(createUserQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);
  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      databaseUser.password
    );
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});
app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const getStatesQuery = `
    SELECT
      *
    FROM
      user
      WHERE
      tweet='${feed}`;
  const userArray = await database.get(getStatesQuery);
  response.send(
    userArray.map((eachUser) => convertUserDbObjectToResponseObject(eachUser))
  );
});

app.get("/user/following/", authenticateToken, async (request, response) => {
  const { followingUserId } = request.params;
  const getStateQuery = `
    SELECT 
      *
    FROM 
      Follower 
    WHERE 
      following_user_id = ${followingUserserId};`;
  const state = await database.get(getStateQuery);
  response.send(convertuFollowerDbObjectToResponseObject(state));
});
app.get("/user/followers/", authenticateToken, async (request, response) => {
  const { followerUserId } = request.params;
  const getStateQuery = `
    SELECT 
      *
    FROM 
      follower 
    WHERE 
      follower_user_id = ${followerUserId};`;
  const state = await database.get(getStateQuery);
  response.send(convertFollowerDbObjectToResponseObject(state));
});
app.get("/tweets/:tweetId/", authenticateToken, async (request, response) => {
  const { tweetId } = request.params;
  const getDistrictsQuery = `
    SELECT
      *
    FROM
     tweet
    WHERE
      tweet_id = ${tweetId};`;
  const tweet = await database.get(getDistrictsQuery);
  response.send(convertTweetsDbObjectToResponseObject(tweet));
});
app.get(
  "/tweets/:tweetId/likes/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const getDistrictsQuery = `
    SELECT
       likes
      *
    FROM
     like
    WHERE
      tweet_id = ${tweetId};`;
    const like = await database.all(getDistrictsQuery);
    response.send(convertTweetDbObjectToResponseObject(like));
  }
);
app.get(
  "/tweets/:tweetId/replies/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const getDistrictsQuery = `
    SELECT
     name,
     reply,
      *
    FROM
     reply
    WHERE
      tweet_id = ${tweetId};`;
    const tweet = await database.get(getDistrictsQuery);
    response.send(convertReplyDbObjectToResponseObject(tweet));
  }
);
app.get("/user/tweets/", authenticateToken, async (request, response) => {
  const { tweet } = request.params;
  const getDistrictsQuery = `
    SELECT
      *
    FROM
     tweet
    WHERE
      tweet = ${tweet};`;
  const tweets = await database.(getDistrictsQuery);
  response.send(convertTweetDbObjectToResponseObject(tweets));
});
app.post("/user/tweets/", authenticateToken, async (request, response) => {
  const { tweet } = request.body;
  const postTweetsQuery = `
  INSERT INTO
    tweet (tweet)
  VALUES
    ('${tweet}');`;
  await database.run(postTweetQuery);
  response.send("Created a Tweet");
});

app.delete(
  "/tweets/:tweetId/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const deleteTweetQuery = `
  DELETE FROM
    tweet
  WHERE
    tweet_Id = ${tweetId};`;
    await database.run(deleteTweetQuery);
    response.send("Tweet Removed");
  }
);

module.exports = app;
