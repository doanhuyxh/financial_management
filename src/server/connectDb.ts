import mongoose, { type Mongoose } from 'mongoose';
import { EnvsConfig } from '@/libs/constants/configKey';
if (!EnvsConfig.MONGODB_URI) {
	throw new Error('Please define the MONGODB_URI environment variable');
}
declare global {
	var mongoose: {
		conn: Mongoose | null;
		promise: Promise<Mongoose> | null;
	};
}
if (!global.mongoose) {
	global.mongoose = { conn: null, promise: null };
}
async function dbConnect(): Promise<Mongoose> {
	if (global.mongoose.conn) {
		return global.mongoose.conn;
	}
	if (!global.mongoose.promise) {
		global.mongoose.promise = mongoose.connect(EnvsConfig.MONGODB_URI!, {
			bufferCommands: false,
			dbName: EnvsConfig.DATABASE_NAME,
			maxPoolSize: 10,
			serverSelectionTimeoutMS: 5000,
			socketTimeoutMS: 45000
		});
	}
	try {
		global.mongoose.conn = await global.mongoose.promise;
	} catch (e) {
		global.mongoose.promise = null;
		throw e;
	}
	return global.mongoose.conn;
}

export default dbConnect;