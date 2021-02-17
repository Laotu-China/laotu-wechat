// miniprogram/pages/item.js
/**
 * For the favorite functionality, pull the isFavorited boolean from the cloud database (user's favlist)
 *    Any updates are made to the local page data boolean. When page closes, update the boolean to the cloud
 *    Loading note: takes a while for isFavorited to be set.  
 * [Future speed]: Consider passing the item data from events so it doesn't have to query from the cloud (lazy load?)
 * 
 * Race condition: user clicks on heart and closes page before local boolean is uploaded.
 *  Solution: Have a rendering page until everything is loaded. Add a small delay before page closes
 * 
 * For the card pop up functionality, when the add to cart or buy now button is clicked in the itemTabBar component, the addToCart()
 * function here is triggered which sets displayPopUp = true and isTabBarHidden = true. The itemTabBar.js listens for any
 * change and will be able to get the isTabBarHidden = true in order to hide the component. 
 */
const app = getApp();

Page({

  /**
   * Page initial data
   */
  data: {
    indicatorDots: true,
    autoplay: false,
    interval: 2000,
    duration: 500,
    vertical: false,
    circular: true,
    itemImages : [], //array of imgSrcs which are strings,
    isTabBarHidden: false,
    displayPopUp: false,
    backgroundBlur : false,
    //numCartItems : null (will be set in onLoad)
    itemQuantity : 1 //quantity of items user wants to add to cart. Changed through quantityChange()
  },

  /**
   * Lifecycle function--Called when page load
   */
  onLoad: function (options) {
    var that = this;
    //Upload number of cartItems
    that.uploadNumCartItems();

    //Set the tabbar Height to pass into the CustomTabBar component
    let tabbarHeight = app.globalData.tabbarHeight;
    this.setData({
      tabbarHeight
    });

    //Get the itemID and the type and set to local storage
    const eventChannel = this.getOpenerEventChannel();
    eventChannel.on('acceptDataFromOpenerPage', function(data){
      let id = data.id;
      let type = data.type;
      //Upload the item type and id
      that.setData({
        itemID : id,
        itemType: type
      });
      //Upload Item Data
      //DEV: Note the race condition. The item data needs to be uploaded before the page is shown.
      that.uploadItemData(id, type);
      //Check if the item is favorited and set the isFavorited data
      that.setIsFavorited(id, type);
    });

  },
  onUnload: function(){
    var that = this;
    //Consider having a timeout to prevent race condition with clickHeart updating local boolean and updateIsFavorited uploading
    //local boolean to cloud
    setTimeout(() => that.updateIsFavorited(), 500);
  },
  uploadItemData: function(itemID, type){
    var that = this;
    //Upload the item data that is necessary. Fetches data by calling wx.cloud query using id and type
    const db = wx.cloud.database({
      env: 'laotudata-laotu'
    });

    if (type === "product"){
      //Get the product info using the id
      db.collection('products').doc(itemID).get()
        .then(function(res){
          let priceStr = res.data.priceStr;
          let title = res.data.title;
          let itemImages = res.data.swiperImageUrls;
          let itemCategories = res.data.itemCategories;
          let descSummary = res.data.descSummary;
          let coverImageSrc = res.data.imageUrl;
          console.log(itemImages);
          //Upload the data to the page data
          that.setData({
            priceStr : priceStr,
            title: title,
            itemImages: itemImages,
            itemCategories: itemCategories,
            descSummary : descSummary,
            coverImageSrc : coverImageSrc  
          });
        })
        .catch(err => console.error(err));
    }
    else if (type === "event"){
      //Get the event info using the id
      db.collection('events').doc(itemID).get()
      .then(function(res){
        let priceStr = res.data.price;
        let title = res.data.title;
        let itemImages = res.data.swiperImageUrls;
        let itemCategories = res.data.itemCategories;
        let descSummary = res.data.descSummary;
        let coverImageSrc = res.data.imageUrl;
        that.setData({
          priceStr: priceStr,
          title: title,
          itemImages : itemImages,
          itemCategories: itemCategories,
          descSummary : descSummary,
          coverImageSrc : coverImageSrc
        });
      })
      .catch(err => console.error(err));
    }
    else{
      console.error("Need to insert either 'product' or 'event' into the searchBar parameter");
    }
  },
  setIsFavorited: async function(itemID, type){
    //Function is called on load. Determines if the item is favorited from the cloud (checks if item in user's favitem list)
    // and sets to the local data
    //Parameters: itemID and type of item ('product' or 'event')
    var that = this;
    //Wait for openID to be passed
    var openID = app.globalData.openid;
    var checkOpenID = function(){
      return new Promise(function(resolve, reject){
        var numLoops = 40;
        (function waitForOpenID(){
          openID = app.globalData.openid;
          if (openID == null){
            //Continually loop until the data is set
            setTimeout(waitForOpenID, 250);
            numLoops -= 1;
            //Only allow max 20 loops
            if (numLoops < 1){
              reject("setisFavorited(): openID took too long to set.");
            }
          }
          else{
            return resolve();
          }
        })();
      });
    }
    await checkOpenID();
    
    //Query the item using its id and type
    const db = wx.cloud.database({
      env: 'laotudata-laotu'
    });

    if (type === 'product'){
      //Query from the userFavProducts
      const products = db.collection('userFavProducts');
      products.doc(openID).get()
        .then(function(res){
          //User's favlist has been init
          //Get user's list of favItems
          let favProducts = res.data.favProducts;
          //Check if item ID is in the favProducts
          let isFavorited = favProducts.includes(itemID);
          console.log("isFav", isFavorited);
          that.setData({
            isFavorited
          });
        })
        .catch(function(err){
          //Need to initialize the user and add an empty favProducts list
          products.add({
            data: {
              _id: openID,
              favProducts: []
            }
          })
            .then(res => console.log("Successfully initialized user"))
            .catch(err => console.error("Failed to initialize user", err));
          //Set the isFavorited to page data as false
          that.setData({
            isFavorited: false
          })
        });

    } 
    else if (type === 'event'){
      //Query from the userFavProducts
      const events = db.collection('userFavEvents');
      events.doc(openID).get()
        .then(function(res){
          //User's favlist has been init
          //Get user's list of favItems
          let favEvents = res.data.favEvents;
          //Check if item ID is in the favProducts
          let isFavorited = favEvents.includes(itemID);
          console.log("isFav", isFavorited);
          that.setData({
            isFavorited
          });
        })
        .catch(function(err){
          //Need to initialize the user and add an empty favEvents list
          events.add({
            data: {
              _id: openID,
              favEvents: []
            }
          })
            .then(res => console.log("Successfully initialized user"))
            .catch(err => console.error("Failed to initialize user", err));
          //Set the isFavorited to page data as false
          that.setData({
            isFavorited: false
          })
        });
    }
    else{
      console.error("In setIsFavorited(): should only have either 'event' or 'product' type available");
    }
  },
  clickHeart: async function(){
    var that = this;
    console.log("clickHeart()");
    //Function is called when heart is clicked. Inverses the local page boolean
    //In order to prevent a race condition where pull data from isFavorited before isFavorited is set, wait
    //until isFavorited != null.
    var checkIsFavoritedSet = function(){
      return new Promise(function(resolve, reject){
        var numLoops = 20;
        (function waitForIsFavorited(){
          if (that.data.isFavorited == null){
            //Continually loop until the data is set
            setTimeout(waitForIsFavorited, 250);
            numLoops -= 1;
            //Only allow max 20 loops
            if (numLoops < 1){
              reject("clickHeart(): Is Favorited took too long to set.");
            }
          }
          else{
            return resolve();
          }
        })();
      });
    }
    //Wait for isFavorited to be set into the data
    await checkIsFavoritedSet();

    let pastIsFavorited = this.data.isFavorited;
    let isFavorited = !pastIsFavorited;
    this.setData({isFavorited});
  },
  onShareAppMessage: function (shareParams) {
    console.log("function onShareAppMessage")
    console.log(shareParams)
  },
  updateIsFavorited: function(){
    console.log("updateIsFav()");
    //Function called on page close. Gets current isFavorited boolean and updates the user's fav item list
    //Return immediately if itemID or itemType were not set and no changes were made
    if (this.data.itemID == null || this.data.itemType == null){
      console.log("itemID or itemType not set before page close: isFavorited not set, no changes were made.");
      return;
    }
    let itemID = this.data.itemID;
    let itemType = this.data.itemType;
    let isFavorited = this.data.isFavorited;
    let openID = app.globalData.openid;
    //Check that openID is valid
    if (openID == null){
      console.error("race condition: openID is not set");
    }
    let db = wx.cloud.database({env: 'laotudata-laotu'});
    let _ = db.command;
    if (isFavorited === true){
      //If itemID doesn't exist in user's fav list, add itemID to list
      //Get the current fav list
      if (itemType === 'product'){
        db.collection('userFavProducts').doc(openID).get()
          .then(function(res){
            //add item if doesn't exist
            var favProducts = res.data.favProducts;
            if (!favProducts.includes(itemID)){
              //Item doesn't exist, add itemID to the end of the array
              db.collection('userFavProducts').doc(openID).update({
                data: {
                  favProducts : _.push(itemID) 
                }
              });
            }
            //item exists, do nothing
          })
          .catch(err => console.error(err));
      } 
      else if (itemType === 'event'){
        db.collection('userFavEvents').doc(openID).get()
          .then(function(res){
            //add item if doesn't exist
            var favEvents = res.data.favEvents;
            if (!favEvents.includes(itemID)){
              //Item doesn't exist, add itemID to the end of the array
              db.collection('userFavEvents').doc(openID).update({
                data: {
                  favEvents : _.push(itemID) 
                }
              });
            }
            //item exists, do nothing
          })
          .catch(err => console.error(err));
      }
      else{
        console.error("Should only be either 'product' or 'event");
      }
    }
    else if (isFavorited === false){
      //If itemID exists in fav Items list, delete
      if (itemType === 'product'){
        db.collection('userFavProducts').doc(openID).get()
          .then(function(res){
            var favProducts = res.data.favProducts;
            if (favProducts.includes(itemID)){
              //Item exist, delete itemID from favList
              const itemIndex = favProducts.indexOf(itemID);
              favProducts.splice(itemIndex, 1);
              db.collection('userFavProducts').doc(openID).update({
                data: {
                  favProducts : favProducts 
                },
                fail: function(err){
                  console.error(err)
                }
              });
            }
            //item not in list, do nothing
          })
          .catch(err => console.error(err));
      } 
      else if (itemType === 'event'){
        //If item is in fav list, delete item
        db.collection('userFavEvents').doc(openID).get()
          .then(function(res){
            var favEvents = res.data.favEvents;
            if (favEvents.includes(itemID)){
              //Item exist, delete itemID from favList
              const itemIndex = favEvents.indexOf(itemID);
              favEvents.splice(itemIndex, 1);
              db.collection('userFavEvents').doc(openID).update({
                data: {
                  favEvents : favEvents 
                },
                fail: function(err){
                  console.error(err)
                }
              });
            }
            //item not in list, do nothing
          })
          .catch(err => console.error(err));
      }
      else{
        console.error("Should only be either 'product' or 'event");
      }

    }
    else {
      console.log("User closed page before isFavorited set. No changes were made.");
    }
  },
  uploadNumCartItems : async function(){
    console.log("uploadNumCartItems()");
    //Function is called onload. Calculates the number of items in the user's cart and sets to local storage
    //which will be passed to the itemTabBar for it to render the cart icon.
    
    let cartResponse = await wx.cloud.callFunction({
      name: 'getUserCart'
    });
    let cartProducts = cartResponse.result.cartProducts;
    let numCartItems = cartProducts.length;
    //Set the number to the local storage
    this.setData({
      numCartItems
    });
  },
  tabBarAddToCart: function(e){
    //Function is triggered by the tabbar component (see itemTabBar.js) when add to cart button is tapped
    //Change the isTabBarHidden to true which will then be passed to the tabBar component and hide the tabbar
    //Change displayPopUp to true in order to show the popUp that allows user to choose quantity
    //Change backgroundBlur to true to blur out the background
    this.setData({
      displayPopUp : true,
      isTabBarHidden : true,
      backgroundBlur : true
    });
  },
  quantityChange : function(e){
    //Function is triggered when the stepper quantity is increased
    //Upload the new quantity
    this.setData({itemQuantity: e.detail});
  },
  addToCart : async function(e){
    //Function is triggered when the user clicks the addToCart button in the cardPopUp
    //Upload the item and the quantity to the cloud
    //Wait for the itemID
    var that = this;
    var checkItemID = function(){
      return new Promise(function(resolve, reject){
        var numLoops = 40;
        (function waitForItemID(){
          var itemID = that.data.itemID;
          if (itemID == null){
            //Continually loop until the data is set
            setTimeout(waitForItemID, 250);
            numLoops -= 1;
            //Only allow max 20 loops
            if (numLoops < 1){
              reject("setisFavorited(): openID took too long to set.");
            }
          }
          else{
            return resolve();
          }
        })();
      });
    }
    await checkItemID();
    var itemID = this.data.itemID;

    //Get the quantity that is in the vant stepper
    let itemQuantity = this.data.itemQuantity;
    console.log("itemQuanitity is ", itemQuantity);
    //Upload the item and itemQuantity to user's cart
    let result = await wx.cloud.callFunction({
      name : 'addItemToCart',
      data : {
        itemid : itemID,
        quantity : itemQuantity
      }
    });

  },
  clickClose : function(e){
    //Function is called when the close button is tapped.
    //Should set displayPopUp to false, isTabBarHidden to false, and backgroundBlur to false to undo everything

    console.log("clickClose()");
    this.setData({
      displayPopUp : false,
      isTabBarHidden : false,
      backgroundBlur : false
    });
  }

  
})