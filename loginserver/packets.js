"use strict";

var db = require('./db');
var constants = require('./constants');

//-----------------------------------------------//
// ClientPacket (packets received by the server) //
//-----------------------------------------------//

function ClientPacket(buffer) {
    this._buffer = buffer;
    this._offset = 0;
    this._data = [];
}

ClientPacket.prototype.readD = function() {
    this._data.push(
        this._buffer.readInt32LE(this._offset)
    );
    this._offset += 4;
    return this;
};

ClientPacket.prototype.readH = function() {
    this._data.push(
        this._buffer.readInt16LE(this._offset)
    );
    this._offset += 2;
    return this;
};

ClientPacket.prototype.readC = function() {
    this._data.push(
        this._buffer.readInt8(this._offset)
    );
    this._offset++;
    return this;
};

ClientPacket.prototype.readF = function() {
    this._buffer.readDoubleLE(this._offset);
    this._offset += 8;
    return this;
}

ClientPacket.prototype.readS = function() {
    var i = this._offset;
    for (; i < this._buffer.length; i += 2) {
        if (this._buffer.readInt16LE(i) === 0x00)
            break;
    }
    this._data.push(
        this._buffer.toString('ucs2', this._offset, i)
    );
    this._offset += i + 2;
    return this;
};

ClientPacket.prototype.readB = function(length) {
    this._data.push(
        buf.slice(this._offset, this._offset + length)
    );
    this._offset += length;
    return this;
}

ClientPacket.prototype.setValid = function(b) {
    this._valid = b;
    return this._valid;
}

ClientPacket.prototype.isValid = function() {
    return this._valid;
}

ClientPacket.prototype.data = function() {
    return this._data;
}

//-----------------------------------------------//
// BasePacket (packets sent by the server)       //
//-----------------------------------------------//

function BasePacket(size) {
    this._buffer = new Buffer(size + 4 + (size + 4) % 8);
    this._buffer.fill(0, size);
    this._offset = 0;
}

BasePacket.prototype.writeD = function(val) {
    this._buffer.writeInt32LE(val, this._offset);
    this._offset += 4;
    return this;
};

BasePacket.prototype.writeH = function(val) {
    this._buffer.writeInt16LE(val, this._offset);
    this._offset += 2;
    return this;
};

BasePacket.prototype.writeC = function(val) {
    this._buffer.writeInt8(val, this._offset);
    this._offset++;
    return this;
};

BasePacket.prototype.writeF = function(dbl) {
    this._buffer.writeDoubleLE(dbl, this._offset);
    this._offset += 8;
    return this;
};

BasePacket.prototype.writeS = function(txt) {
    if (txt) {
        this._buffer.write(txt, this._offset, 'ucs2');
        this._offset += this.constructor.strlen(txt);
    }

    this._buffer.writeInt16LE(0, this._offset - 2);
    return this;
};

BasePacket.prototype.writeB = function(buf) {
    if (!Buffer.isBuffer(buf)) {
        throw 'Argument is not a buffer';
    }
    buf.copy(this._buffer, this._offset);
    this._offset += buf.length;
    return this;
};

BasePacket.getContent = function() {
    return this._buffer;
};

BasePacket.strlen = function(str) {
    return Buffer.byteLength(str, 'ucs2') + 2;
};

//-----------------------------------------------//
// Login Server packets                          //
//-----------------------------------------------//

function AuthResponse(serverId) {
    var serverName = db.getGameServer(serverId).name;
    var p = new BasePacket(BasePacket.strlen(serverName) + 2);
    return p.writeC(0x02)
            .writeC(serverId)
            .writeS(serverName);
}

function ChangePasswordResponse(success, charName, msg) {
    var p = new BasePacket(1 + BasePacket.strlen(charName) +
        BasePacket.strlen(msg));
    return p.writeC(0x06)
            .writeS(charName)
            .writeS(msg);
}

function KickPlayer(account) {
    var p = new BasePacket(1 + BasePacket.strlen(account));
    return p.writeC(0x04)
            .writeS(account);
}

function InitLS(pubkey) {
    var p = new BasePacket(9 + pubkey.length);
    return p.writeC(0x00)
            .writeD(constants.PROTOCOL_REV)
            .writeD(pubkey.length)
            .writeB(pubkey);
}

function LoginServerFail(reason) {
    var p = new BasePacket(2);
    return p.writeC(0x01).writeC(reason);
}

function PlayerAuthResponse(account, response) {
    var p = new BasePacket(2 + BasePacket.strlen(account));
    return p.writeC(0x03)
            .writeS(account)
            .writeC(response ? 1 : 0);
}

function RequestCharacters(account) {
    var p = new BasePacket(1 + BasePacket.strlen(account));
    return p.writeC(0x05)
            .writeS(account);
}

//-----------------------------------------------//
// Login server client packets                   //
//-----------------------------------------------//

function AuthGameGuard(buffer) {
    var p = new ClientPacket(buffer);
    if (p.setValid(buffer.length >= 20)) {
        p.readD()
         .readD()
         .readD()
         .readD()
         .readD();
        p.sessionId = p._data[0];
    }
    return p;
}

function RequestAuthLogin(buffer) {
    var p = new ClientPacket(buffer);
    if (p.setValid(buffer.length >= 128)) {
        p.readB(128);
    }

    // FIXME: Decipher login/password.
}

// FIXME: RequestServerList, RequestServerLogin

//-----------------------------------------------//
// Module exports                                //
//-----------------------------------------------//
module.exports = {
    serverPackets: {
        AuthResponse: AuthResponse,
        ChangePasswordResponse: ChangePasswordResponse,
        KickPlayer: KickPlayer,
        InitLS: InitLS,
        LoginServerFail: LoginServerFail,
        PlayerAuthResponse: PlayerAuthResponse,
        RequestCharacters: RequestCharacters
    },
    clientPackets: {
        AuthGameGuard: null,
        RequestAuthLogin: null,
        RequestServerList: null,
        RequestServerLogin: null
    }
};