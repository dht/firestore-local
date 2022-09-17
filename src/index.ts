export type { FirebaseApp } from 'firebase/app';
export type { Firestore } from 'firebase/firestore/lite';

import axios, { AxiosInstance } from 'axios';

export type QueryConstraint = {
    field: string;
    sign: string;
    value: string;
};

export type Query<T = any> = {
    path: string;
    qs: string;
};

let instance: AxiosInstance;

const getFirestore = (_app: any): any => {};

const collection = (_db: any, ...args: string[]) => {
    return Ref.from(args);
};

const getDocsByRef = async (ref: Ref) => {
    const path = ref.pathName;
    const response = await instance.get(path);
    return Snapshot.from(response?.data);
};

const getDocs = async <T>(query: Query | Ref) => {
    if (query instanceof Ref) {
        return getDocsByRef(query);
    }

    const { path, qs } = query;

    const response = await instance.get(path, {
        params: qs,
    });

    return Snapshot.from(response.data);
};

const exists = async (path: string) => {
    try {
        const response = await instance.get(path);
        return true;
    } catch (_err) {
        return false;
    }
};

const pathDown = (path: string) => {
    const parts = path.split('/');
    parts.pop();
    return parts.join('/');
};

const getPathInfo = (path: string) => {
    const [_v1, nodeName, id, _v2, itemId] = path.split('/');

    return {
        path,
        id,
        itemId,
        nodeName,
    };
};

const getListItemPath = (path: string) => {
    const pathInfo = getPathInfo(path);
    const { nodeName, itemId } = pathInfo;

    const newNodeName = nodeName + 'Items';

    return `/${newNodeName}/${itemId}`;
};

const setDoc_item = async (ref: Ref, data: Json, _options: Json = {}) => {
    const path = ref.pathName;

    const pathExists = await exists(path);
    const pathInfo = getPathInfo(path);

    let response;

    try {
        if (pathExists) {
            response = await instance.patch(path, data);
        } else {
            data.id = pathInfo.id;
            response = await instance.post(pathDown(path), data);
        }
    } catch (err: any) {
        console.log(
            [err.request.method, err.request.path, err.request.data].join(' ')
        );
    }
};

const setDoc_listItem = async (ref: Ref, data: Json, _options: Json = {}) => {
    const path = ref.pathName;

    const pathInfo = getPathInfo(path);
    const { nodeName } = pathInfo;

    const listItemPath = getListItemPath(path);

    const pathExists = await exists(listItemPath);

    const nodeNameSingle = nodeName.replace(/e?s$/, '');

    const idField = `${nodeNameSingle}Id`;
    data[idField] = pathInfo.id;

    data['id'] = pathInfo.itemId;

    let response;

    if (pathExists) {
        response = await instance.patch(listItemPath, data);
    } else {
        response = await instance.post(pathDown(listItemPath), data);
    }
};

const setDoc = async (ref: Ref, data: Json, _options: Json = {}) => {
    const path = ref.pathName;

    const count = path.split('/').length;

    if (count === 3) {
        return setDoc_item(ref, data, _options);
    }

    if (count === 5) {
        return setDoc_listItem(ref, data, _options);
    }

    const response = await instance.patch(path, data);

    return Snapshot.from(response?.data);
};

const getDoc = async (ref: Ref) => {
    const path = ref.pathName;
    const response = await instance.get(path);
    return Snapshot.from(response?.data);
};

const deleteDoc = async (ref: Ref) => {
    const path = ref.pathName;
    const response = await instance.delete(path);
    return Snapshot.from(response?.data);
};

const doc = (_db: any, ...args: string[]) => {
    return Ref.from(args);
};

const addDoc = async (ref: Ref, data: Json) => {
    const path = ref.path.toString();
    const response = await instance.post(path, data);

    return Snapshot.from(response.data);
};

const writeBatch = (_db: any) => {
    return new Batch();
};

const query = (ref: Ref, ...constrains: QueryConstraint[]): Query => {
    const pathName = ref.pathName;
    const isSingles = pathName.includes('singles');
    const isListItems = pathName.match(/\/items$/);
    const firstConstrain = constrains[0];

    const pathInfo = getPathInfo(pathName);

    if (isSingles) {
        const { value } = firstConstrain;

        return {
            path: `/${value}`,
            qs: '',
        };
    }

    if (isListItems) {
        return {
            path: pathName.replace(/items$/, `${pathInfo.nodeName}Items`),
            qs: '',
        };
    }

    return {
        path: pathName,
        qs: '',
    };
};

const where = (...args: string[]) => {
    const [field, sign, value] = args;
    return { field, sign, value };
};

class Ref {
    static from(xpath: string[]) {
        return new Ref(xpath);
    }

    constructor(private xpath: string[]) {}

    get path() {
        return {
            toString: () => this.xpath.join('.'),
        };
    }

    get pathName() {
        return '/' + this.xpath.join('/').replace(/^singles\//, '');
    }
}

class Doc {
    constructor(private _data: Json) {}

    data() {
        return this._data;
    }
}

class Snapshot {
    public id: string = '';

    docs: Doc[] = [];

    static from(_data: Json | Json[]) {
        return new Snapshot(_data);
    }

    constructor(private _data: Json | Json[]) {
        const data = this._data;
        if (Array.isArray(data)) {
            this.docs = data.map((item) => {
                return new Doc(item);
            });
        }
    }

    data() {
        return this._data;
    }
}

type Operation = {
    type: 'set' | 'delete' | 'update';
    ref: Ref;
    data?: Json;
};

class Batch {
    operations: Operation[] = [];

    set(ref: Ref, data: Json) {
        this.operations.push({ type: 'set', ref, data });
    }

    delete(ref: Ref) {
        this.operations.push({ type: 'delete', ref });
    }

    update(ref: Ref, data: Json) {
        this.operations.push({ type: 'update', ref, data });
    }

    async commit() {
        const promises = this.operations.map((operation) => {
            const { type, ref, data = {} } = operation;

            switch (type) {
                case 'set':
                case 'update':
                    return setDoc(ref, data);
                case 'delete':
                    return deleteDoc(ref);
            }
        });

        return Promise.all(promises);
    }
}

const init = (baseURL: string) => {
    instance = axios.create({
        baseURL,
    });
};

export const initAxiosInstance = (_instance: AxiosInstance) => {
    instance = _instance;
};

init('http://localhost:3001');

export const initializeApp = (..._args: any[]) => {};

export const firebase = {
    init,
    initializeApp,
    getFirestore,
    collection,
    getDocs,
    setDoc,
    getDoc,
    deleteDoc,
    doc,
    addDoc,
    writeBatch,
    query,
    where,
};
