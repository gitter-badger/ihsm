'use strict';
const queue = require('queue');
const assert = require('assert');

const INDENTATION_SIZE = 4;

class State {

    onEntry(self) { }

    onExit(self) { }

    onUnknownMessage(self, message) {
        self.log(`Unhandled event: ${messageToString(message.type, message.payload)})`);
    }

    onError(self, error) {
        self.log("Begin onError");
        console.log(error);
        self.log("End onError");
    }
}

class UninitializedState extends State {
    initialize(self, initialState) { self.transition(initialState); }
}

exports.State = State;

function indent(n) {
    assert(Number.isInteger(n));
    if (n === 0) {
        return "";
    }
    return " ".repeat(INDENTATION_SIZE * n)
}

function logFull(self, text) {
    if (self.__loglevel__) console.log(`${indent(self.__indent__)}${self.__name__}(${self.__state__.name}): ${text}`);
}

function logPlain(self, text) {
    if (self.__loglevel__) console.log(`${indent(self.__indent__)}${text}`);
}

class Actor {
    constructor(initialState, name, tracing) {
        assert(initialState, `Invalid initial state: ${initialState}"`);
        assert(State.isPrototypeOf(initialState), "initialState must inherit from 'ProtocolState'");
        this.__loglevel__ = tracing;
        this.__state__ = UninitializedState;
        this.__name__ = name;
        this.__queue__ = queue({
            'concurrency': 1,
            'autostart': true,
            'timeout': 0,
        });
        this.__indent__ = 0;
        this.post("initialize", initialState)
    }

    transition(state) {
        this.log('Begin Transition');
        ++this.__indent__;
        this.log('onExit');
        this.__state__.prototype["onExit"](this);
        this.__state__ = state;
        this.log('onEntry');
        this.__state__.prototype["onEntry"](this);
        --this.__indent__;
        this.log('End Transition');
    }

    post(messageType, messageData) {
        this.__queue__.push(createPostTask(this, messageType, messageData));
    }

    send(messageType, messageData) {
        let actor = this;
        return new Promise(function (resolve, reject) {
            actor.__queue__.push(createSendTask(actor, messageType, messageData, resolve, reject));
        });
    }

    log(text) {
        logFull(this, text)
    }

    logMe() {
        if (this.__loglevel__) {
            this.log("Begin logMe");
            ++this.__indent__;
            logPlain(this, `name: "${this.__name__}"`);
            logPlain(this, `state: "${this.__state__.name}"`);
            if (this.__loglevel__) {
                for (let actorKey in this) {
                    if (!this.hasOwnProperty(actorKey) || actorKey.startsWith("_")) {
                        continue;
                    }
                    logPlain(this, `${actorKey}: ${JSON.stringify(this[actorKey])}`);
                }
            }
            --this.__indent__;
            this.log("End logMe");
        }
    }

}



function createActor(initialState, name = 'Actor', tracing = false) {
    return new Actor(initialState, name, tracing);
}

exports.createActor = createActor;




