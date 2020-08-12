/* Consider speeding up the page load by not calculating the width of a container to make it square */
/** Developer Notes:
 * index represents the tab index (0, 1), while itemIndex represents the item in the array of items
 */
const app = getApp();

Page({
  data: {
    motto: 'Hello World',
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    tabs: [],
    activeTab : 0,
    heights: {},
    widths: {
      favImgContainer : "0"
    },
    //key:value is eventID: boolean
    isFavorited: {},
    blankHeartSrc : "https://toppng.com/uploads/preview/heart-icon-transparent-icon-symbol-love-black-11553480202wbkavsmiom.png",
    clickHeartSrc : "https://w7.pngwing.com/pngs/776/399/png-transparent-heart-computer-icons-red-heart-icon-dark-border-love-heart-desktop-wallpaper.png",
    currHeartSrc : "https://toppng.com/uploads/preview/heart-icon-transparent-icon-symbol-love-black-11553480202wbkavsmiom.png",
  },
  //事件处理函数
  bindViewTap: function() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  onLoad: function () {
    //upload sizes
    this.uploadSizes();

    //get the eventsData from the cloud and set the tabsData to pageData
    this.parseEventsData();

    //get the isFavorited boolean data structure from cloud and set to pageData
    //getFavoritedData();
    //DELETE below once implement getFavoritedData()
    var isFavorited = {
      "unique1" : true,
      "unique2" : true,
      "unique3" : true,
      "unique4" : true,
      "unique5" : false
    };
    this.setData({isFavorited});




    var that = this;
    //this.setData({tabs});
    
     /* Now I will initialize the isFavorited array */
    //this.initIsFavorited();

    


    
  },
  getUserInfo: function(e) {
    console.log(e)
    app.globalData.userInfo = e.detail.userInfo
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
  },
  onTabClick(e) {
    const index = e.detail.index;
    console.log("tab clicked");
    this.setData({ 
      activeTab: index 
    })
  },

  onChange(e) {
    const index = e.detail.index;
    console.log("Something changed");
    this.setData({ 
      activeTab: index 
    })
  },
  handleClick(e) {
      console.log("Handle Clicked");
  },
  uploadSizes(){
    let that = this;
    //make favImg-container square
    //get the height
    let query = wx.createSelectorQuery();
    query.select('#favImg-container').boundingClientRect(function(rect){
      console.log(rect);
      that.setData({
        'widths.favImgContainer' : String(rect.height)
      });
    }).exec(); 
  },
  favorited: function(event){
    let itemindex = parseInt(event.currentTarget.dataset.itemindex);
    let tabindex = parseInt(event.currentTarget.dataset.index);
    console.log(event.currentTarget.dataset);
    console.log("item index: " + itemindex + " tab index: " + tabindex);

    let tabs = this.data.tabs;
    let currentSrc = tabs[tabindex][1][itemindex].favSrc;
    
    //If current image is empty or blankheart, change to clickHeart and upload that event data 
    if (currentSrc === "" || currentSrc === this.data.blankHeartSrc){
      //change image source to the clicked heart
      tabs[tabindex][1][itemindex].favSrc = this.data.clickHeartSrc;
      //get the event data
      let eventData = this.data.tabs[tabindex][1][itemindex];
      //upload the event data to the favorites global data
      var favoriteEventsTabData = app.globalData.favoriteEventsTabData;
      favoriteEventsTabData[tabindex][itemindex] = eventData;
      app.globalData.favoriteEventsTabData = favoriteEventsTabData;
      this.setData({
        tabs
      });
    }
    else{
      //switch back to blankSrc
      //switch to clickSrc
      tabs[tabindex].data[itemindex].favSrc = this.data.blankHeartSrc;
      this.setData({
        tabs
      });
    }





    //change the image to the favorited heart
    /*let currentSrc = this.data.currHeartSrc;
    let blankHeartSrc = this.data.blankHeartSrc;
    let clickHeartSrc = this.data.clickHeartSrc;
    //this switches the images. CHANGE URL IF CHANGE ICONS
    let newSrc = (currentSrc === blankHeartSrc ? clickHeartSrc : blankHeartSrc);
    this.setData({
      currHeartSrc : newSrc
    });
    console.log("favorite image change");*/
  },
  navHandler: function(event){
    let that = this;
    let tabindex = event.currentTarget.dataset.index;
    let itemindex = event.currentTarget.dataset.itemindex;
    let navUrl = this.data.tabs[tabindex].data[itemindex].navUrl;
    //DEV NOTE: alternatively, we use some kind of url scheme such that the we can manually create the URL using indices
    

    //redirect to a specific page when the event row is clicked
    wx.switchTab({
      url: navUrl,
    });
  },
  initIsFavorited: function(){
    let numberTabs = this.data.tabs.length;
    var isFavorited = [];
    this.data.tabs.forEach(function(tabData){
      //for each tab, append an array that is of length # of table rows with all false
      var tabArray = []; 
      //init tabArray to be false for each item
      tabData.data.forEach(function(item){
        tabArray.push(false);
      }); 

      //add false array to isFavorited
      isFavorited.push(tabArray); 
    });
    
    //upload the isFavorited
    this.setData({
      isFavorited
    });
  },
  objectToArray: function(obj){
    let outerArray = Object.values(obj);
    var tabs = [];
    outerArray.forEach(function(o){
      let innerArray = Object.values(o);
      tabs.push(innerArray);
    });
    return tabs;
  },
  parseEventsData: function(){
    //pull the eventsData from the cloud and create two tabData objects that contain title of tab and the data (past and upcoming events)
    //then, it sets the data to the pageData
    const db = wx.cloud.database();
    const _ = db.command;
    
    //get the events data ordered chronologically
    const events = db.collection('events').orderBy('datetime', 'desc');
    //query events that are upcoming
    const upcomingEvents = events.where({
      datetime: _.gt(db.serverDate())
    });
    //query events that are past
    const pastEvents = events.where({
      datetime: _.lte(db.serverDate())
    });
    
    var that = this;
    //create the upcoming and past tabData
    upcomingEvents.get()
      .then(function(res){
        const upcomingData = res.data;
        //get the pastData
        pastEvents.get()
          .then(function(res){
            const pastData = res.data;
            //create our tabsData array object
            var tabs = [{
              title : "Upcoming",
              data : upcomingData 
            }, {
              title : "Past",
              data : pastData
            }];
            //upload to tabs
            that.setData({tabs});
            console.log("Events page tabs data set.");
          })
          .catch(err => console.error(err))
      })
      .catch(err => console.error(err));
  }
})