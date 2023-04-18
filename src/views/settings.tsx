import React from 'react';
import { Buffer } from 'buffer';
import { useGlobalContext } from '../stores';
import * as jimp from 'jimp';

async function manipulateImage(imgBuf: Buffer) {
    console.log(jimp);
}

export function ProfileView() {
    const { pintswap } = useGlobalContext();
    let [bio, setBio] = React.useState<string>('');
    let [initialized, setInitialized] = React.useState<boolean>(false);
    let [shortAddress, setShortAddress] = React.useState<string>('');
    let [profilePic, setProfilePic] = React.useState<string | Buffer | Uint8Array | null>(null);

    /*
     * check if pintswap module is initialized and/or has starting vals for bio, shortaddress, setProfilePic
     * only should run if pintswap is initialized and only run once
     */
    React.useEffect(() => {
        if (pintswap.module && !initialized) {
            let { bio: _bio, image: _image } = (pintswap.module as any).userData;
            if (_bio !== '') setBio(_bio);
            if (_image) setProfilePic(_image);
            setInitialized(true);
        }
    }, [pintswap.module, initialized]);

    async function processImage(e: any) {
        let image = (e.target.files as any)[0] ?? null;
        let _buff = Buffer.from(await image.arrayBuffer());
        manipulateImage(_buff);
        let _b64 =
            typeof jimp.read === 'function'
                ? await (await jimp.read(_buff))
                      .resize(50, 50)
                      .quality(20)
                      .getBase64Async('image/jpg')
                : _buff.toString('base64');
        setProfilePic(_b64);
    }

    function updateBio(e: any) {
        setBio(e.target.value);
    }

    function updateText(e: any) {
        setShortAddress(e.target.value);
    }

    return (
        <>
            <div>
                <img
                    src={`data:image/jpg;base64,${profilePic}`}
                    height={125}
                    width={125}
                    className="rounded-full"
                />
                <input
                    type="file"
                    name="profile-image"
                    accept=".jpg, .jpeg, .png"
                    onChange={processImage}
                />
                <div></div>
            </div>
            <div>
                <h1 className="text-lg">Address</h1>
                <input
                    value={`${shortAddress}`}
                    className="font-titillium text-black"
                    type="text"
                    name="short-address"
                    onChange={updateText}
                />
            </div>
            <div>
                <h1 className="text-lg">Bio</h1>
                <input
                    value={bio}
                    className="font-titillium text-black"
                    type="text"
                    name="bio"
                    onChange={updateBio}
                />
            </div>
            <div>
                <button onClick={() => null}>Save</button>
            </div>
        </>
    );
}
