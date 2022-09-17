import { initAxiosInstance, firebase } from '.';
import { Chance } from 'chance';

const chance = new Chance();

describe('local', () => {
    let data;

    let instance: AxiosInstance;

    beforeEach(() => {
        instance = {
            get: jest.fn(),
            patch: jest.fn(),
            delete: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
        };

        initAxiosInstance(instance as any);
    });

    const randomId = () => String(chance.integer({ min: 0, max: 100 }));

    it('single | get', async () => {
        const nodeName = chance.word();

        const ref = firebase.doc(null, 'singles', nodeName);
        await firebase.getDoc(ref);

        expect(instance.get).toHaveBeenCalledWith(`/${nodeName}`);
    });

    it('single | patch', async () => {
        const nodeName = chance.word();

        data = {
            number: chance.integer(),
        };

        const ref = firebase.doc(null, 'singles', nodeName);
        await firebase.setDoc(ref, data);

        expect(instance.patch).toHaveBeenCalledWith(`/${nodeName}`, data);
    });

    it('collection | get', async () => {
        const nodeName = chance.word();

        const ref = firebase.collection(null, nodeName);
        await firebase.getDocs(ref);

        expect(instance.get).toHaveBeenCalledWith(`/${nodeName}`);
    });

    it('collection | updateMany', async () => {
        const nodeName = chance.word();
        const id = randomId();

        data = {
            number: chance.integer(),
        };

        const batch = firebase.writeBatch(null);
        const ref = firebase.doc(null, nodeName, id);
        batch.update(ref, data);
        await batch.commit();

        expect(instance.patch).toHaveBeenCalledWith(`/${nodeName}/${id}`, data);
    });

    it('collection | addMany', async () => {
        const nodeName = chance.word();
        const id = randomId();

        data = {
            number: chance.integer(),
        };

        const batch = firebase.writeBatch(null);
        const ref = firebase.doc(null, nodeName, id);
        batch.set(ref, data);
        await batch.commit();

        expect(instance.patch).toHaveBeenCalledWith(`/${nodeName}/${id}`, data);
    });

    it('collection | deleteMany', async () => {
        const nodeName = chance.word();
        const id = randomId();

        const ref = firebase.doc(null, nodeName, id);

        const batch = firebase.writeBatch(null);
        batch.delete(ref);
        await batch.commit();

        expect(instance.delete).toHaveBeenCalledWith(`/${nodeName}/${id}`);
    });

    it('groupedList | patchItem', async () => {
        const nodeName = chance.word();
        const id = randomId();
        const itemId = randomId();

        data = {
            number: chance.integer(),
        };

        const ref = firebase.doc(null, nodeName, id, 'items', itemId);

        await firebase.setDoc(ref, data);

        expect(instance.patch).toHaveBeenCalledWith(
            `/${nodeName}/${id}/items/${itemId}`,
            data
        );
    });
});

interface AxiosInstance {
    get: jest.Mock;
    patch: jest.Mock;
    delete: jest.Mock;
    post: jest.Mock;
    put: jest.Mock;
}
