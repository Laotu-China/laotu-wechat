// miniprogram/pages/addUserInfo.js
/**
 * This page either a) Set and upload user default shipping info to the cloud 
 *    or b) upload shipping info to globalData under parameter 'shippingInfo' for checkout.js
 *    If setUserInfo from options is "true", upload to userInfo shippingInfo.
 *    Else, we upload 'userInfo' to globalData and also 'shippingInfoEdit' : true to let checkout know that 
 *    the edit was successful.
 * If page fails to set, upload 'shippingInfoEdit' : false to show that edit failed.
 * Parent page that navigates to this must pass '?setUserInfo=boolean' in the navigateTo URL
 * shippingInfo : {name : str, streetName : str, phoneNumber: string,
 *                 regionCityDistrictArray : ['regionStr', 'cityStr', 'districtStr']}     
 */
var app = getApp();

Page({

  /**
   * Page initial data
   */
  data: {
    regionCityDistrictArray:  ["北京市", "北京市", "东城区"], //first ['region', 'city', 'district']
    name: '',
    streetName : '',
    phoneNumber : '',
  },

  /**
   * Lifecycle function--Called when page load
   */
  onLoad: async function (options) {
    console.log("editShippingInfo options", options);
    let setUserInfo = options.setUserInfo;
    //Upload the boolean setUserInfo which will determine where to upload the data
    if (setUserInfo === "true"){
      this.setData({setUserInfo : true});
    }
    else{
      this.setData({setUserInfo : false});
    }
    let userInfoResp = await wx.cloud.callFunction({
      name : 'getUserInfo'
    });
    let userInfo = userInfoResp.result.userInfo[0];
    let shippingInfo = userInfo.shippingInfo;
    console.log(userInfo);
    //Check if the shippingInfo is empty (will either be {} or complete due to the tests in editShoppingInfo)
    var shippingInfoComplete;
    if (shippingInfo == null){
      shippingInfoComplete = false;
    }
    else if (Object.values(shippingInfo).length < 1){
      shippingInfoComplete = false;
    }
    else{
      shippingInfoComplete = true;
    }
    //If complete, upload the streetName, the city, the district, and the name
    if (shippingInfoComplete){
      this.setData({
        streetName: shippingInfo.streetName,
        city : shippingInfo.regionCityDistrictArray[1],
        district : shippingInfo.regionCityDistrictArray[2],
        province : shippingInfo.regionCityDistrictArray[0],
        phoneNumber : shippingInfo.phoneNumber,
        name : shippingInfo.name ,
        regionCityDistrictArray : shippingInfo.regionCityDistrictArray            
        });
    }
    //start with shippingInfoEdit = false in case the user never hits the submit button
    app.globalData.shippingInfoEdited = false;
    
  },
  onChange : function(event){
    console.log(event.detail);
  },
  bindRegionChange: function (e) {
    //Called whenever user selects a certain region
    //Upload an array of ['Province','City','District']
    console.log('picker region values', e.detail.value)
    this.setData({
      regionCityDistrictArray: e.detail.value
    })
  },
  nameInputChange: function(e){
    //Called whenever the input is changed
    let name = e.detail.value;
    this.setData({name})
  },
  streetInputChange: function(e){
    //Called whenever the input is changed
    let streetName = e.detail.value;
    this.setData({streetName})
  },
  mobileInputChange: function(e){
    //Called whenever the input is changed
    let phoneNumber = e.detail.value;
    this.setData({phoneNumber})
  },
  bindUserInfoChange: function(e) {
    this.setData({setUserInfo: !this.data.setUserInfo})
  },
  submitForm : async function(e){
    //Called when user clicks confirm button
    //Verify whether or not the input is valid
    var valid;
    let name = this.data.name;
    let streetName = this.data.streetName;
    let phoneNumber = this.data.phoneNumber;
    let regionCityDistrictArray = this.data.regionCityDistrictArray;

    //Make sure that all input have some length
    if (name.length < 1 || streetName.length < 1 || phoneNumber.length < 1){
      valid = false;
    }
    //Make sure that phoneNumber only has digits
    else if (!/^\d+$/.test(phoneNumber)){
      valid = false;
    }
    else{
      valid = true;
    }
    //Display an error test if not valid
    if (!valid){
      wx.showToast({
        title : "Invalid/Missing Info",
        icon : 'none',
        duration: 1000
      });
      //Let checkout.js know that the editShippingInfo did not successfully upload data.
      app.globalData.shippingInfoEdited = false;
    }
    else{
      //Test passed. Upload data and show a success icon.
      wx.showToast({
        title : "保存成功",
        icon: "success",
        duration: 1000
      });

      setTimeout(() => {
        wx.navigateBack({
          delta: 1,
        });
      }, 1000);

      //If setUserInfo is true, upload to user's shippingInfo
      if (this.data.setUserInfo === true){
        //Upload the user's info to the cloud, under 'userInfo'
        wx.cloud.callFunction({
          name : 'addShippingInfo',
          data: {
            name : name, 
            streetName : streetName,
            regionCityDistrictArray : regionCityDistrictArray,
            phoneNumber : phoneNumber
          }
        });
      }
      else if (this.data.setUserInfo === false){
        //Let checkout.js know that the editShippingInfo did successfully upload data.
        app.globalData.shippingInfoEdited = true;
        //Upload the shipping data to the globalData under shippingInfo
        app.globalData.shippingInfo = {
          name : name, 
          streetName : streetName,
          regionCityDistrictArray : regionCityDistrictArray,
          phoneNumber : phoneNumber
        };
      }
      else{
        throw new Error("editShoppingInfo race condition: setUserInfo not yet uploaded");
      }
    }
  }
  
})