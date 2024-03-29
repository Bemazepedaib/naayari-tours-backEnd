// Mongoose Model
const Event = require('../models/Event');
// GraphQL types
const { GraphQLString, GraphQLList } = require('graphql');
// User defined types
const { EventType } = require('../types/typeDefs');

const events = {
    type: new GraphQLList(EventType),
    resolve(_, __) {
        return Event.find()
    }
}

const event = {
    type: EventType,
    args: { 
        eventDate: { type: GraphQLString },
        eventTrip: { type: GraphQLString }
    },
    resolve(_, { eventDate, eventTrip }) {
        return Event.findOne({ eventDate, eventTrip })
    }
}

module.exports = {
    events, event
}