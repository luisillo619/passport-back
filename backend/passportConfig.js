require("dotenv").config();
const {CLIENT_ID_GOOGLE, CLIENT_SECRET_GOOGLE} = process.env
const User = require("./user");
const Provider = require("./provider");
const bcrypt = require("bcryptjs");
const localStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;

module.exports = function (passport) {

  passport.use("local",
    new localStrategy((username, password, done) => {
      User.findOne({ username: username }, (err, user) => {
        if (err) throw err;
        if (!user) return done(null, false);
        bcrypt.compare(password, user.password, (err, result) => {
          if (err) throw err;
          if (result === true) {
            console.log("esto en la estrategia", user)
            return done(null, user);
          } else {
            return done(null, false);
          }
        });
      });
    })
  );

  passport.use(
    new GoogleStrategy(
      {
        clientID:
        CLIENT_ID_GOOGLE,
        clientSecret: CLIENT_SECRET_GOOGLE,
        callbackURL: "/auth/google/callback",
        state: true,
      },
      async function (accessToken, refreshToken, profile, cb) {
        try {
          const email = profile._json?.email; // use optional chaining operator
          if (!email) {
            throw new Error("No email found in Google profile");
          }

          const provider = await Provider.findOne({
            provider: profile.provider,
            subject: profile.id,
          });

          if (!provider) {
            const user = new User({
              email,
              name: profile.displayName,
            });
            await user.save();

            const newProvider = new Provider({
              user_id: user._id,
              provider: profile.provider,
              subject: profile.id,
            });
            await newProvider.save();
             
            return cb(null, user);
          } else {
            const user = await User.findById(provider.user_id);
            return cb(null, user);
          }
        } catch (err) {
          return cb(err);
        }
      }
    )
  );

  // LA SERAILIZACION Y LA DESERIALIZACION SE REALIZAN DESPUES DE QUE EL USUSARIO SE LOGEO CORRECTAMENTE(DESPUES DE QUE EL CALLBACK DE LAS ESTRATEGIAS RETORNE CORRECTAMENTE AL USUSARIO)

  passport.serializeUser((user, cb) => {
    console.log("me estoy serializando", user)
    cb(null, user.id);
  });

  passport.deserializeUser((id, cb) => {
    console.log("me estoy deseralizando id",id)
    User.findOne({ _id: id }, (err, user) => {
      const userInformation = {
        name: user.name,
        username: user.username,
      };
      console.log("sigo deseralizandome", userInformation)
      cb(err, userInformation);
    });
  });
};

// En primer lugar, la funci??n serializeUser de Passport se utiliza para almacenar informaci??n del usuario en una sesi??n de usuario. En este caso, la informaci??n del usuario que se va a almacenar es el id del usuario. Cuando el usuario inicia sesi??n, se llama a esta funci??n y se pasa el objeto user como argumento junto con una funci??n de devoluci??n de llamada cb que se encarga de cualquier error que pueda surgir durante el proceso.

// En segundo lugar, la funci??n deserializeUser de Passport se utiliza para recuperar la informaci??n del usuario almacenada en la sesi??n y devolverla al servidor para su uso en la aplicaci??n. En este caso, se busca en la base de datos de usuarios utilizando el id del usuario que se pas?? en la funci??n serializeUser. Si se encuentra el usuario, se crea un objeto userInformation que contiene los datos relevantes del usuario, como su nombre y nombre de usuario, y se devuelve a trav??s de la funci??n de devoluci??n de llamada cb. Si no se encuentra el usuario o si hay alg??n error durante el proceso, se pasa el error a la funci??n de devoluci??n de llamada cb.

// En resumen, Passport.js se utiliza para autenticar a los usuarios en una aplicaci??n web y esta secci??n de c??digo configura c??mo se almacenan y recuperan los datos de los usuarios de la sesi??n de Passport.
