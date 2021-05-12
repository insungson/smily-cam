//아래의
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  TouchableOpacity,
  View,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Camera } from "expo-camera"; //기존의 expo 에서 가져왔던게 바뀌었다.
import styled from "styled-components/native";
// import { MaterialIcons } from "@expo/vector-icons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons"; //위의 expo 대신 이걸 써도 된다.
import * as FaceDetector from "expo-face-detector";
import * as MediaLibrary from "expo-media-library";

// Camera 의 style 에서 flex:1 로 안주고 width, height 로 줘서 가로 세로 높이를 설정해야 카메라 태그가 잘 작동한다.
// https://docs.expo.io/versions/latest/sdk/camera/    를 참조하자
// (여기서 ref 로 검색하면 ref로 element 에 접근할 수 있음을 알 수 있다)

//아래의 코드처럼 Camera 태그에 style을 적용시킨다면... 카메라 화면의 크기를 조절 할 수 있다.

//아래의 코드처럼 Camera 태그에 style을 적용시킨다면... 카메라 화면의 크기를 조절 할 수 있다.

// 얼굴인식의 faceDetector 는 아래의 링크를 참고해서 보면 된다
// https://docs.expo.io/versions/v41.0.0/sdk/facedetector/

// 리엑트에서의 reference 는 함수에서 해당 element를 조작하는 기본적인 방법이다.
// 아래의 카메라 element 에서도 같이 reference를 추가하여 처리해보자 (ref를 로그로 찍어보면 객체나 함수들을 볼 수 있다.)

// MediaLibrary 를 사용하여 사진이나 동영상을 저장할 것이다.
// https://docs.expo.io/versions/latest/sdk/media-library/  참조
// 1. asset 을 만들고
// 2. album을 만들고 앨범을 찾으면 그안에 이미지를 넣어주고, album이 없으면 album을 만들어준다.

const { width, height } = Dimensions.get("screen");

const ALBUM_NAME = "Smiley Cam";

const CenterView = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  background-color: cornflowerblue;
`;

const Text = styled.Text`
  color: white;
  font-size: 22px;
`;

const IconBar = styled.View`
  margin-top: 50px;
`;

export default () => {
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraType, setCameraType] = useState(Camera.Constants.Type.front);
  const [smileDetected, setsmileDetected] = useState(false);
  const [smilePercent, setSmilePercent] = useState(null);
  const cameraRef = useRef();

  //useEffect는 반드시 함수만을 리턴해야 하기 때문에.. 아래와 같이 코드를 작성하면 에러가 발생한다...
  // https://im-developer.tistory.com/155   참고
  // useEffect(async () => {
  //   const { status } = await Camera.requestPermissionsAsync();
  //   if (status === "granted") {
  //     setHasPermission(true);
  //   } else {
  //     setHasPermission(false);
  //   }
  // }, []);
  useEffect(() => {
    const reqPermission = async () => {
      const { status } = await Camera.requestPermissionsAsync();
      if (status === "granted") {
        setHasPermission(true);
      } else {
        setHasPermission(false);
      }
    };
    reqPermission();
  }, []);

  const switchCameraType = useCallback(() => {
    // 콘솔을 찍어본 결과 front = 1, back = 0 이다.
    if (cameraType === Camera.Constants.Type.front) {
      setCameraType(Camera.Constants.Type.back);
    } else {
      setCameraType(Camera.Constants.Type.front);
    }
  }, [cameraType]);

  const onFacesDetected = useCallback((faceConstants) => {
    // console.log("faceConstants", faceConstants);
    const face = faceConstants?.faces[0];
    if (face) {
      if (face.smilingProbability > 0.7) {
        setsmileDetected(true);
        setSmilePercent(Math.ceil(face.smilingProbability * 100));
        takePhoto();
      }
    }
  }, []);

  const takePhoto = useCallback(async () => {
    try {
      if (cameraRef.current) {
        // console.log("cameraRef.current: ", cameraRef.current);
        // Camera element 의 ref 에 접근하여 함수를 가져와 아래에서 실행
        let { uri } = await cameraRef.current.takePictureAsync({
          quality: 1,
        });
        if (uri) {
          savePhoto(uri);
        }
      }
    } catch (error) {
      alert(error);
      setsmileDetected(false);
    }
  }, []);

  const savePhoto = useCallback(async (uri) => {
    try {
      //권한요청 MediaLibrary 는 따로 요청해야 한다.
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === "granted") {
        //MediaLibrary의 asset을 만들고
        const asset = await MediaLibrary.createAssetAsync(uri);
        let album = await MediaLibrary.getAlbumAsync(ALBUM_NAME);
        //앨범의 유무에 따라 조건을 나눠서 처리
        if (album === null) {
          album = await MediaLibrary.createAlbumAsync(ALBUM_NAME, asset);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album.id);
        }
        setTimeout(() => {
          setsmileDetected(false);
          setSmilePercent(null);
        }, 2000);
      } else {
        setHasPermission(false);
      }
    } catch (error) {
      console.log(error);
    }
  }, []);

  return (
    <>
      {hasPermission === true ? (
        <CenterView>
          <Text>Smile to take photo</Text>
          {smilePercent && (
            <Text>Your Smiling Percentage is {smilePercent}%</Text>
          )}
          <Camera
            style={{
              width: width - 40,
              height: height / 1.5,
              borderRadius: 20,
              // overflow: "hidden"
            }}
            type={cameraType}
            onFacesDetected={smileDetected ? null : onFacesDetected}
            faceDetectorSettings={{
              detectLandmarks: FaceDetector.Constants.Landmarks.all,
              runClassifications: FaceDetector.Constants.Classifications.all,
            }}
            ref={cameraRef}
          />
          <IconBar>
            <TouchableOpacity onPress={switchCameraType}>
              <MaterialIcons
                name={
                  cameraType === Camera.Constants.Type.front
                    ? "camera-rear"
                    : "camera-front"
                }
                color="white"
                size={50}
              />
            </TouchableOpacity>
          </IconBar>
        </CenterView>
      ) : hasPermission === false ? (
        <CenterView>
          <Text>Don't have permission for this</Text>
        </CenterView>
      ) : (
        <CenterView>
          <ActivityIndicator />
        </CenterView>
      )}
    </>
  );
};
