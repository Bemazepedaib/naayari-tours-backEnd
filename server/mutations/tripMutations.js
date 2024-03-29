// Mongoose Model
const Trip = require('../models/Trip');
// GraphQL types
const { GraphQLString, GraphQLList, GraphQLNonNull, GraphQLBoolean, GraphQLInt, GraphQLFloat } = require('graphql');
// User defined types
const { InputTripInformationType, InputTripReviewType } = require('../types/typeDefs');

const addTrip = {
    type: GraphQLString,
    args: {
        tripName: { type: GraphQLString },
        tripInformation: { type: InputTripInformationType },
        tripKit: { type: GraphQLString },
        tripRating: { type: GraphQLFloat },
        tripStatus: { type: GraphQLBoolean },
        tripReview: { type: new GraphQLList(InputTripReviewType) }
    },
    async resolve(_, { tripName, tripInformation, tripKit, tripRating, tripStatus, tripReview }, { verifiedUser }) {
        if (!verifiedUser) throw new Error("Debes iniciar sesion para realizar esta accion");
        if (verifiedUser.userType !== "admin") throw new Error("Solo un administrador puede agregar viajes");
        const exists = await Trip.findOne({ tripName });
        if (exists) throw new Error("El viaje ya está creado");
        const trip = new Trip({
            tripName, tripInformation,
            tripKit, tripRating,
            tripStatus, tripReview
        });
        await trip.save();
        return "¡Viaje creado exitosamente!";
    }
}

const deleteTrip = {
    type: GraphQLString,
    args: {
        tripName: { type: new GraphQLNonNull(GraphQLString) }
    },
    async resolve(_, { tripName }, { verifiedUser }) {
        if (!verifiedUser) throw new Error("Debes iniciar sesion para realizar esta accion");
        if (verifiedUser.userType !== "admin") throw new Error("Solo un administrador puede eliminar viajes");
        const deleted = await Trip.findOneAndDelete({ tripName });
        if (!deleted) throw new Error("No se pudo eliminar el viaje");
        return "¡Viaje Borrado exitosamente!";
    }
}

const updateTripStatus = {
    type: GraphQLString,
    args: {
        tripName: { type: new GraphQLNonNull(GraphQLString) },
        tripStatus: { type: new GraphQLNonNull(GraphQLBoolean) }
    },
    async resolve(_, { tripName, tripStatus }, { verifiedUser }) {
        if (!verifiedUser) throw new Error("Debes iniciar sesion para realizar esta accion");
        if (verifiedUser.userType !== "admin") throw new Error("Solo un administrador puede eliminar viajes");
        const updated = await Trip.findOneAndUpdate(
            { tripName },
            { $set: { tripStatus } },
            { new: true }
        );
        if (!updated) throw new Error("No se pudo actualizar el estado del viaje");
        return "¡Estado del viaje actualizdo exitosamente!";
    }
}

const updateTrip = {
    type: GraphQLString,
    args: {
        tripName: { type: GraphQLString },
        tripInformation: { type: InputTripInformationType },
        tripKit: { type: GraphQLString },
        tripRating: { type: GraphQLFloat },
        tripStatus: { type: GraphQLBoolean },
        tripReview: { type: new GraphQLList(InputTripReviewType) }
    },
    async resolve(_, { tripName, tripInformation, tripKit, tripRating, tripStatus, tripReview }, { verifiedUser }) {
        if (!verifiedUser) throw new Error("Debes iniciar sesion para realizar esta accion");
        if (verifiedUser.userType !== "admin") throw new Error("Solo un administrador puede actualizar los viajes");
        const updated = await Trip.findOneAndUpdate(
            { tripName },
            {
                $set: {
                    tripInformation, tripKit,
                    tripRating, tripStatus,
                    tripReview
                }
            },
            { new: true }
        );
        if (!updated) throw new Error("No se pudo actualizar el viaje");
        return "¡Viaje Actualizado exitosamente!";
    }
}

const addReview = {
    type: GraphQLString,
    args: {
        tripName: { type: GraphQLString },
        tripReview: { type: InputTripReviewType }
    },
    async resolve(_, { tripName, tripReview }, { verifiedUser }) {
        const trip = await Trip.findOne({ tripName })
        let tripRating = 0;
        trip.tripReview.map(review => {
            tripRating += review.rating;
        })
        tripRating += tripReview.rating;
        tripRating /= trip.tripReview.length + 1;
        const updated = await Trip.findOneAndUpdate(
            { tripName },
            {
                $push: { tripReview },
                $set: { tripRating }
            },
            { new: true }
        );
        if (!updated) throw new Error("No se pudo agregar la reseña");
        return "¡Reseña agregada exitosamente!";
    }
}

const deleteReview = {
    type: GraphQLString,
    args: {
        tripName: { type: GraphQLString },
        tripReview: { type: InputTripReviewType }
    },
    async resolve(_, { tripName, tripReview }, { verifiedUser }) {
        if (!verifiedUser) throw new Error("Debes iniciar sesion para realizar esta accion");
        if (verifiedUser.userType !== "admin") throw new Error("Solo un administrador puede actualizar los viajes");
        const trip = await Trip.findOne({ tripName })        
        const index = trip.tripReview.findIndex(review => 
            review.user === tripReview.user && review.rating === tripReview.rating &&
            review.review === tripReview.review && review.date === tripReview.date &&
            review.photo === tripReview.photo
        )
        trip.tripReview.splice(index, 1)
        let newRating = 0;
        if (trip.tripReview.length > 0) {
            trip.tripReview.map(review => {
                newRating += review.rating;
            })
            newRating /= trip.tripReview.length;
        } else {
            newRating = 5;
        }
        const updated = await Trip.findOneAndUpdate(
            { tripName },
            {
                $set: { 
                    tripReview: trip.tripReview, 
                    tripRating: newRating 
                }
            },
            { new: true }
        );
        if (!updated) throw new Error("No se pudo elimiar la reseña");
        return "¡Reseña eliminada exitosamente!";
    }
}

const updateDiscount = {
    type: GraphQLString,
    async resolve(_, __) {
        const trips = await Trip.find({ 'tripInformation.discount.available': true });
        const currentDate = new Date().toISOString().split("T")[0].split("-").reverse();
        const promises = trips.map(async (trip) => {
            const dateEnd = trip.tripInformation.discount.dateEnd.split("/");
            const newTripInformation = { ...trip.tripInformation };
            newTripInformation.discount.available = false;

            if (currentDate[1] > dateEnd[1] || (currentDate[1] === dateEnd[1] && currentDate[0] > dateEnd[0])) {
                const updated = await Trip.findOneAndUpdate(
                    { tripName: trip.tripName },
                    { $set: { tripInformation: newTripInformation } },
                    { new: true }
                );

                if (!updated) {
                    throw new Error("No se pudo deshabilitar el descuento");
                }

                return "¡Descuento deshabilitado exitosamente!";
            }
        });
        await Promise.all(promises);
        return "Terminó el proceso de deshabilitar descuentos";
    }
};


module.exports = {
    addTrip, deleteTrip, updateTripStatus, updateTrip, addReview, deleteReview, updateDiscount
}