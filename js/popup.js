var app = new Vue({
    el: '#app',
    data:{
        loading: true,
        data:{
            uid:0,
            room_id:0,
            title:"",
            live_time:"",
            list:[]
        },
        status:1,
        input:"",
        temp_time:""
    },
    computed: {
    },
    mounted: function() {
        this.getRoomid(this.getStorage)
    },
    updated: function() {
    },
    methods:{
        getRoomid(callback){
            var that = this
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs)
            {
                var patt = "(?<=com/)[0-9]+"
                var url = tabs[0].url
                that.data.room_id = Number(url.match(patt))
                callback(that.data.room_id)
            });
        },
        getStorage(room_id){
            var that = this
            chrome.storage.sync.get(room_id.toString(), function(items) {
                if(JSON.stringify(items)=="{}"){
                    //未记录过
                    console.log("本直播间未记录过")
                    that.status=0

                    that.loading = false
                } else {
                    that.data = items[room_id.toString()]
                    that.$http.get("https://api.live.bilibili.com/room/v1/Room/get_info?from=room&room_id="+room_id.toString()).then(
                    function(response){
                        if((response.data.data.room_id==that.data.room_id || response.data.data.short_id == that.data.room_id)
                            && response.data.data.live_time==that.data.live_time){
                            //本次直播记录中
                            console.log("本次直播记录中")
                            that.status = 1
                            
                            that.loading = false
                            that.$refs.loginput.focus()
                        } else {
                            //上次记录的直播已经结束
                            console.log("上次记录的直播已经结束")
                            that.status = 2

                            that.loading = false
                        }
                    },
                    function(response){
                        that.loading = false
                    })
                }
            });
        },
        startRecord(){
            var that = this
            that.$http.get("https://api.live.bilibili.com/room/v1/Room/get_info?from=room&room_id="+this.data.room_id.toString()).then(
                    function(response){
                        if( response.data.data.live_status == 1){
                            that.data.uid = response.data.data.uid
                            if(response.data.data.short_id != 0){
                                that.data.room_id = response.data.data.short_id
                            }else{
                                that.data.room_id = response.data.data.room_id
                            }
                            that.data.title = response.data.data.title
                            that.data.live_time = response.data.data.live_time
                            that.data.list = []
                            that.status = 1
                            var temp_data = {}
                            temp_data[that.data.room_id] = that.data
                            chrome.storage.sync.set(temp_data)
                            console.log("重新开始记录")
                        } else {
                            that.$message({
                                message:'当前直播间未开播',
                                offset:6,
                                center:true,
                                duration:1000,
                            });
                        }
                    },
                    function(response){

                    })
        },
        clearRecord(){
            this.$confirm('此操作将删除本次全部记录，是否继续？', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning',
                customClass: 'confirm-message'
            }).then(() => {
                chrome.storage.sync.remove(this.data.room_id.toString())
                this.status = 0
                console.log("已删除本直播间记录")
                this.$message({
                    type: 'success',
                    message: '删除成功!',
                    offset:6,
                    center:true,
                    duration:1000
                });
            }).catch(() => {
                this.$message({
                    type: 'info',
                    message: '已取消删除',
                    offset:6,
                    center:true,
                    duration:1000
                });          
            });
        },
        saveRecord(){
            var that = this
            var temp_data = {}
            temp_data[that.data.room_id] = that.data
            chrome.storage.sync.set(temp_data)
            console.log("记录已保存")
        },
        addRecordItem(){
            if (this.temp_time == ""){
                var date1= this.data.live_time;  //开始时间
                var offset_GMT = new Date().getTimezoneOffset(); // 本地时间和格林威治的时间差，单位为分钟
                var nowDate = new Date().getTime(); // 本地时间距 1970 年 1 月 1 日午夜（GMT 时间）之间的毫秒数
                var date2 = new Date(nowDate + offset_GMT * 60 * 1000 + 8 * 60 * 60 * 1000); //当前东八区时间
                var date3 = date2.getTime() - new Date(date1).getTime();   //时间差的毫秒数    
                //计算出相差天数
                var days=Math.floor(date3/(24*3600*1000))
                //计算出小时数
                var leave1=date3%(24*3600*1000)    //计算天数后剩余的毫秒数
                var hours=Math.floor(leave1/(3600*1000))
                //计算相差分钟数
                var leave2=leave1%(3600*1000)        //计算小时数后剩余的毫秒数
                var minutes=Math.floor(leave2/(60*1000))
                //计算相差秒数
                var leave3=leave2%(60*1000)      //计算分钟数后剩余的毫秒数
                var seconds=Math.round(leave3/1000)
                var time = hours.toString()+":"+minutes.toString().padStart(2,'0')+":"+seconds.toString().padStart(2,'0')
                this.temp_time = time
            }
            this.data.list.push({time:this.temp_time,desc:this.input})
            console.log("添加一条记录")
            this.saveRecord()
            this.input = ""
            this.temp_time = ""
        },
        delRecordItem(pos){
            this.data.list.splice(pos, 1)
            console.log("删除一条记录")
            this.saveRecord()
        },
        exportData(){
            var that = this
            var text = ""
            text = text + "直播间："+ this.data.title　+ "\n开播时间：" + this.data.live_time + "\n"
            for (item in this.data.list){
                text = text + this.data.list[item].time + " - " + this.data.list[item].desc + "\n"
            }

            this.$copyText(text).then(function (e) {
                console.log(that.$refs.loginput)
                that.$message({
                    message:'记录已拷贝到剪贴板',
                    offset:6,
                    center:true,
                    duration:3000});
              }, function (e) {
                that.$message({
                    message:'拷贝到剪贴板错误',
                    offset:6,
                    center:true,
                    duration:1000});
            })
        },
        recordTempTime(){
            var date1= this.data.live_time;  //开始时间
            var date2 = new Date();    //结束时间
            var date3 = date2.getTime() - new Date(date1).getTime();   //时间差的毫秒数    
            //计算出相差天数
            var days=Math.floor(date3/(24*3600*1000))
            //计算出小时数
            var leave1=date3%(24*3600*1000)    //计算天数后剩余的毫秒数
            var hours=Math.floor(leave1/(3600*1000))
            //计算相差分钟数
            var leave2=leave1%(3600*1000)        //计算小时数后剩余的毫秒数
            var minutes=Math.floor(leave2/(60*1000))
            //计算相差秒数
            var leave3=leave2%(60*1000)      //计算分钟数后剩余的毫秒数
            var seconds=Math.round(leave3/1000)
            var time = hours.toString()+":"+minutes.toString().padStart(2,'0')+":"+seconds.toString().padStart(2,'0')
            this.temp_time = time
            this.$message({
                    message:'当前时间已记录',
                    offset:6,
                    center:true,
                    duration:1000});
        }
    }
});
