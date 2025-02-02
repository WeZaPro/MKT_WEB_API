//TODO เอา code นี้ไปทำต่อ

require("dotenv").config(); // Ensure you have dotenv installed and configured
const express = require("express");
const bodyParser = require("body-parser");
const { FacebookAdsApi, AdSet, Ad } = require("facebook-nodejs-business-sdk");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());
const port = 3000;

const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const appId = process.env.FACEBOOK_APP_ID;
const appSecret = process.env.FACEBOOK_APP_SECRET;

const fb_fields =
  "campaign_name,adset_name,adset_id,ad_name,ad_id,reach, impressions,clicks,cpm,cpc,ctr,frequency,actions, conversions,spend";

const adAccountId = process.env.facebook_acc_id; //business ads id
const filterAd_Set_ID = process.env.FILTER_ADSET_ID;
FacebookAdsApi.init(accessToken);

app.get("/getFbAllPost", async (req, res) => {
  const pageId = "102047299140283";
  const facebookApiUrl = `https://graph.facebook.com/v17.0/${pageId}/posts`;
  const accessTokenPost =
    "EAAFxXnwMhMoBO76YujH3G67btwpaQ5qIzLeQZCkCJZCERpHfAgvchP45nItYMdWHNd2Al9PqIyHdNoxpdCWpnvwZAb3J1rSzIBkCPz2eyNZBesBWzDEeQmXuKARxya57ckYbh5kjgzdv3zJn8Wis0IwurJrgE2Ydxxhs3WK278o1hZCaWhUGcdBG9yEeCIbSUnaDnTSWyvurGggWgAJOHeMYUECjEYWNaMxDBQlIy";

  const excludedPostIds = [
    "102047299140283_258835483565495",
    "102047299140283_282317460876026",
    "102047299140283_250622764386767",
    "102047299140283_102712619073751",
    "102047299140283_126831099995236",
    "102047299140283_127125526632460",
  ];
  // ฟังก์ชันสำหรับดึงข้อความในเครื่องหมาย ""
  const extractTextInQuotes = (message) => {
    if (!message) return null; // ถ้า message เป็น null หรือ undefined ให้คืนค่า null
    const regex = /"([^"]+)"/; // หาข้อความที่อยู่ระหว่างเครื่องหมาย ""
    const match = message.match(regex);
    return match ? match[1] : null; // คืนค่าข้อความใน "" ถ้าเจอ, ไม่เจอจะคืน null
  };

  try {
    const params = {
      fields: "id,message,full_picture",
      access_token: accessTokenPost,
    };
    const response = await axios.get(facebookApiUrl, { params });

    // กรองโพสต์ที่ไม่ต้องการออก
    const filteredPosts = response.data.data.filter(
      (post) => !excludedPostIds.includes(post.id)
    );

    // ดึงข้อความในเครื่องหมาย "" สำหรับแต่ละโพสต์
    const postsWithExtractedText = filteredPosts.map((post) => {
      const extractedText = extractTextInQuotes(post.message || ""); // ใช้ "" แทนถ้า message เป็น undefined
      return {
        id: post.id,
        originalMessage: post.message || "", // กำหนดข้อความต้นฉบับให้เป็น "" ถ้าไม่มีข้อความ
        extractedText: extractedText,
        full_picture: post.full_picture || null, // กำหนดรูปภาพเป็น null ถ้าไม่มี
      };
    });

    res.json({ data: postsWithExtractedText });
  } catch (error) {
    console.error(
      "Error fetching posts:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: error.response?.data || error.message });
  }
});
app.get("/ReportAll", async (req, res) => {
  console.log("test----->");
  const startDate = "2023-07-01";
  const endDate = "2023-09-30";
  const status = "PAUSED";

  const data = await getAdInsights(startDate, endDate, status);
  // console.log("data", data);
  // res.send(data.data);
  res.send({ api: "getAdInsights", data: data.data });
});

app.get("/ReportByDate", async (req, res) => {
  console.log("test----->");
  const startDate = "2023-07-01";
  const endDate = "2023-09-30";
  const status = "PAUSED";

  const data = await getDailyAdInsights(startDate, endDate, status);
  // console.log("data", data);

  res.send({ api: "getDailyAdInsights", data: data.data });
});

app.get("/listAdset", async (req, res) => {
  // const status = "PAUSED";
  // const startDate = "2023-07-01";
  // const endDate = "2023-09-30";
  const { status, startDate, endDate } = req.body;
  const AdsetName_Arr = [];

  try {
    const listAdset_name = await listAdset(startDate, endDate, status);

    if (listAdset_name.data.length === 0) {
      console.log("No data found for the specified date range.");
      return res.send({
        api: "listAdset",
        message: "No data found",
        listAdset: [],
      });
    }

    // ดึง adset_name และกรองค่าให้เหลือค่าเดียว
    // const uniqueAdsetNames = new Set();
    // listAdset_name.data.forEach((e) => {
    //   if (!uniqueAdsetNames.has({ id: e.adset_id, name: e.adset_name })) {
    //     uniqueAdsetNames.add({ id: e.adset_id, name: e.adset_name });
    //     AdsetName_Arr.push({ id: e.adset_id, name: e.adset_name });
    //   }
    // });
    const uniqueAdsetNames = new Set();
    listAdset_name.data.forEach((e) => {
      if (!uniqueAdsetNames.has(e.adset_name)) {
        uniqueAdsetNames.add(e.adset_name);
        AdsetName_Arr.push(e.adset_name);
      }
    });

    // console.log("AdsetName_Arr +++++++ ", AdsetName_Arr);

    res.send({ api: "listAdset", listAdset: Array.from(uniqueAdsetNames) });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send({ error: "Failed to fetch adset data" });
  }
});

app.get("/getAdByAdSet", async (req, res) => {
  console.log("test----->");
  const adset_name = req.body.adset_name;
  const startDate = "2023-07-01";
  const endDate = "2023-09-30";
  const status = "PAUSED";

  try {
    // ดึงข้อมูลทั้งหมด
    const data = await getAdInsights(startDate, endDate, status);

    // กรองข้อมูลเฉพาะ adset_name ที่ส่งมา
    const filteredData = filterAdsByAdset(data.data, adset_name);

    res.send({ api: "filterAdsByAdset", filteredData });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send({ error: "Failed to fetch and process ad insights" });
  }
});

app.get("/getAdByAdSetByDate", async (req, res) => {
  console.log("test----->");
  const adset_name = req.body.adset_name;
  const startDate = "2023-07-01";
  const endDate = "2023-09-30";
  const status = "PAUSED";

  try {
    // ดึงข้อมูลทั้งหมด
    const data = await getDailyAdInsights(startDate, endDate, status);

    // กรองข้อมูลเฉพาะ adset_name ที่ส่งมา
    const filteredData = filterAdsByAdset(data.data, adset_name);

    const filter_separeate_adName = separeate_adName(filteredData, adset_name);
    // console.log("filter_separeate_adName ", filter_separeate_adName);

    res.send({ api: "filterAdsByAdset", filter_separeate_adName });
    // res.send("TEST");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send({ error: "Failed to fetch and process ad insights" });
  }
});

app.get("/getActionByAdsName", async (req, res) => {
  const ad_name = req.body.ad_name;
  const startDate = "2023-07-01";
  const endDate = "2023-09-30";
  const status = "PAUSED";

  try {
    // ดึงข้อมูลทั้งหมด
    // const data = await getAdInsights(startDate, endDate, status);

    const data = await getDailyAdInsights(startDate, endDate, status);

    // กรองข้อมูลเฉพาะ adset_name ที่ส่งมา
    const filteredData = filterActionByAdsName(data.data, ad_name);
    // console.log("filteredData ", filteredData);
    const filter_separeate_adName = separeate_action_adName(
      filteredData,
      ad_name
    );
    // console.log("filter_separeate_adName ", filter_separeate_adName);

    res.send({ api: "filter_separeate_adName", filter_separeate_adName });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send({ error: "Failed to fetch and process ad insights" });
  }
});
//==============

app.get("/getActionByAdsSet", async (req, res) => {
  // const adset_name = req.body.adset_name;
  const { status, startDate, endDate, adset_name } = req.body;
  // const startDate = "2023-07-01";
  // const endDate = "2023-09-30";
  // const status = "PAUSED";

  try {
    // ดึงข้อมูลทั้งหมด
    // const data = await getAdInsights(startDate, endDate, status);

    const data = await getDailyAdInsights(startDate, endDate, status);
    // console.log("getDailyAdInsights ====> ", data);
    // กรองข้อมูลเฉพาะ adset_name ที่ส่งมา
    const filteredData = filterActionByAdsSet(data.data, adset_name);
    // console.log("filteredData ====> ", filteredData);
    // console.log("filterActionByAdsSet ", filteredData);

    const filter_separeate_adName = separeate_action_adSet_Name(
      filteredData,
      adset_name
    );
    // console.log("filter_separeate_adName ====> ", filter_separeate_adName);

    res.send({
      api: "filter_separeate_adName",
      filter_separeate_adName: filter_separeate_adName,
    });
    // res.send({ api: "filter_separeate_adName" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send({ error: "Failed to fetch and process ad insights" });
  }
});

const separeate_action_adSet_Name = (inputData, adset_name) => {
  // console.log("inputData ", inputData);
  // ฟิลด์ของ actions ที่ต้องการ
  const actionFields = [
    "post_engagement",
    "page_engagement",
    "photo_view",
    "post",
    "post_reaction",
    "link_click",
  ];
  // กรองข้อมูลตาม ad_name
  const filteredData = inputData.filter(
    (item) => item.adset_name === adset_name
  );

  // จัดกลุ่มข้อมูลตาม ad_name
  const groupedData = filteredData.reduce((acc, current) => {
    const adName = current.ad_name;
    if (!acc[adName]) {
      acc[adName] = [];
    }
    acc[adName].push(current);
    return acc;
  }, {});

  // สร้าง array สำหรับ actions
  const arr_actions = [];
  Object.entries(groupedData).forEach(([key, value]) => {
    value.forEach((item) => {
      const actionObj = {
        ad_name: key,
        campaign_name: item.campaign_name,
        adset_name: item.adset_name,
        startDate: item.date_start,
        endDate: item.date_stop,

        ad_name: item.ad_name,
        reach: item.reach,
        impressions: item.impressions,
        clicks: item.clicks,
        spend: item.spend,
        cpm: item.cpm,
        cpc: item.cpc,
        ctr: item.ctr,
        frequency: item.frequency,
      };

      // ตั้งค่า default เป็น 0 สำหรับทุก actionFields
      actionFields.forEach((field) => {
        actionObj[`actions.${field}`] = 0;
      });

      // แปลง actions เป็น key-value
      item.actions.forEach((action) => {
        actionObj[`actions.${action.action_type}`] = action.value;
      });

      arr_actions.push(actionObj);
    });
  });

  // เรียงลำดับข้อมูล
  arr_actions.sort((a, b) => {
    // เรียงลำดับ campaign_name
    if (a.campaign_name < b.campaign_name) return -1;
    if (a.campaign_name > b.campaign_name) return 1;

    // เรียงลำดับ adset_name
    if (a.adset_name < b.adset_name) return -1;
    if (a.adset_name > b.adset_name) return 1;

    // เรียงลำดับ ad_name
    if (a.ad_name < b.ad_name) return -1;
    if (a.ad_name > b.ad_name) return 1;

    // เรียงลำดับ startDate
    if (a.startDate < b.startDate) return -1;
    if (a.startDate > b.startDate) return 1;

    return 0;
  });

  // console.log("arr_actions> ", arr_actions);
  const _formatActionData = formatActionData(arr_actions);
  //console.log("_formatActionData ", _formatActionData);
  // return arr_actions;
  return _formatActionData;
};

const formatActionData = (inputData) => {
  const formattedData = [];

  // จัดกลุ่มข้อมูลตาม ad_name, campaign_name, adset_name
  inputData.forEach((item) => {
    console.log("item=> ", item);
    // ค้นหาข้อมูลที่ตรงกันใน formattedData
    let existingAd = formattedData.find(
      (ad) =>
        ad.ad_name === item.ad_name &&
        ad.campaign_name === item.campaign_name &&
        ad.adset_name === item.adset_name
    );

    if (!existingAd) {
      // หากไม่มีข้อมูลที่ตรงกันให้สร้างใหม่
      existingAd = {
        ad_name: item.ad_name,
        campaign_name: item.campaign_name,
        adset_name: item.adset_name,
        date_list: [],
        reach: [],
        impressions: [],
        clicks: [],
        spend: [],
        cpm: [],
        cpc: [],
        ctr: [],
        frequency: [],
        actions_post_engagement: [],
        actions_page_engagement: [],
        actions_photo_view: [],
        actions_post_reaction: [],
        actions_link_click: [],
      };
      formattedData.push(existingAd);
    }

    // เพิ่มข้อมูลใน date_list, reach, impressions, clicks
    existingAd.date_list.push(item.startDate.substring(2)); // แปลงวันที่เป็นรูปแบบ "23-07-13"
    existingAd.reach.push(parseInt(item.reach)); // เปลี่ยนค่าของ reach เป็นตัวเลข
    existingAd.impressions.push(parseInt(item.impressions)); // เปลี่ยนค่าของ impressions เป็นตัวเลข
    existingAd.clicks.push(parseInt(item.clicks)); // เปลี่ยนค่าของ clicks เป็นตัวเลข
    existingAd.spend.push(parseFloat(parseFloat(item.spend).toFixed(2))); // เปลี่ยนค่าของ clicks เป็นตัวเลข
    existingAd.cpm.push(parseFloat(parseFloat(item.cpm).toFixed(2))); // เปลี่ยนค่าของ clicks เป็นตัวเลข
    existingAd.cpc.push(parseFloat(parseFloat(item.cpc).toFixed(2))); // เปลี่ยนค่าของ clicks เป็นตัวเลข
    existingAd.ctr.push(parseFloat(parseFloat(item.ctr * 100).toFixed(2)));
    // เปลี่ยนค่าของ clicks เป็นตัวเลข
    existingAd.frequency.push(
      parseFloat(parseFloat(item.frequency).toFixed(2))
    ); // เปลี่ยนค่าของ clicks เป็นตัวเลข
    // existingAd.post_engagement.push(parseInt(item.actions.post_engagement)); // เปลี่ยนค่าของ clicks เป็นตัวเลข
    // เพิ่มค่า actions.post_engagement ลงใน array
    // เพิ่มค่า actions.post_engagement ลงใน array
    existingAd.actions_post_engagement.push(
      parseInt(item["actions.post_engagement"])
    ); // ใช้ 'actions.post_engagement'
    existingAd.actions_page_engagement.push(
      parseInt(item["actions.page_engagement"])
    ); // ใช้ 'actions.post_engagement'
    existingAd.actions_photo_view.push(parseInt(item["actions.photo_view"])); // ใช้ 'actions.post_engagement'
    existingAd.actions_post_reaction.push(
      parseInt(item["actions.post_reaction"])
    );
    existingAd.actions_link_click.push(parseInt(item["actions.link_click"]));
  });

  return { data: formattedData };
};

//===============

const separeate_action_adName = (inputData, adNameFilter) => {
  // ฟิลด์ของ actions ที่ต้องการ
  const actionFields = [
    "post_engagement",
    "page_engagement",
    "photo_view",
    "post",
    "post_reaction",
    "link_click",
  ];
  // กรองข้อมูลตาม ad_name
  const filteredData = inputData.filter(
    (item) => item.ad_name === adNameFilter
  );

  // จัดกลุ่มข้อมูลตาม ad_name
  const groupedData = filteredData.reduce((acc, current) => {
    const adName = current.ad_name;
    if (!acc[adName]) {
      acc[adName] = [];
    }
    acc[adName].push(current);
    return acc;
  }, {});

  // สร้าง array สำหรับ actions
  const arr_actions = [];
  Object.entries(groupedData).forEach(([key, value]) => {
    value.forEach((item) => {
      const actionObj = {
        ad_name: key,
        campaign_name: item.campaign_name,
        adset_name: item.adset_name,
        startDate: item.startDate,
        endDate: item.endDate,
      };

      // ตั้งค่า default เป็น 0 สำหรับทุก actionFields
      actionFields.forEach((field) => {
        actionObj[`actions.${field}`] = 0;
      });

      // แปลง actions เป็น key-value
      item.actions.forEach((action) => {
        actionObj[`actions.${action.action_type}`] = action.value;
      });

      arr_actions.push(actionObj);
    });
  });

  // console.log("arr_actions> ", arr_actions);

  return arr_actions;
};

const separeate_adName = (inputData, adsetNameFilter) => {
  // console.log("inputData ", inputData);
  // กรองข้อมูลตาม adset_name
  const filteredData = inputData.filter(
    (item) => item.adset_name === adsetNameFilter
  );

  // จัดกลุ่มข้อมูลตาม ad_name
  const groupedData = filteredData.reduce((acc, current) => {
    const adName = current.ad_name;
    if (!acc[adName]) {
      acc[adName] = [];
    }
    acc[adName].push(current);
    return acc;
  }, {});
  // console.log("groupedData> ", groupedData);
  return groupedData;
};

function filterActionByAdsSet(data, adset_name) {
  // console.log("data====> ", data);
  return data
    .filter((item) => item.adset_name === adset_name)
    .map((item) => ({
      campaign_name: item.campaign_name,
      adset_name: item.adset_name,
      ad_name: item.ad_name,
      reach: item.reach,
      impressions: item.impressions,
      clicks: item.clicks,
      spend: item.spend,
      cpm: item.cpm,
      cpc: item.cpc,
      ctr: item.ctr,
      frequency: item.frequency,
      date_start: item.date_start,
      date_stop: item.date_stop,

      actions: item.actions,

      // เพิ่มฟิลด์ที่ต้องการดึง
      //campaign_name,adset_name,ad_name,reach, impressions,clicks,  cpm,cpc,ctr,frequency,actions, conversions,   spend
    }));
}

function filterActionByAdsName(data, ad_name) {
  // console.log("data====> ", data);
  return data
    .filter((item) => item.ad_name === ad_name)
    .map((item) => ({
      campaign_name: item.campaign_name,
      adset_name: item.adset_name,
      ad_name: item.ad_name,
      startDate: item.date_start,
      endDate: item.date_stop,
      actions: item.actions,

      // เพิ่มฟิลด์ที่ต้องการดึง
      //campaign_name,adset_name,ad_name,reach, impressions,clicks,  cpm,cpc,ctr,frequency,actions, conversions,   spend
    }));
}

// ฟังก์ชันกรองข้อมูลเฉพาะ adset_name
function filterAdsByAdset(data, adset_name) {
  return data
    .filter((item) => item.adset_name === adset_name)
    .map((item) => ({
      campaign_name: item.campaign_name,
      adset_name: item.adset_name,
      ad_name: item.ad_name,
      reach: item.reach,
      impressions: item.impressions,
      clicks: item.clicks,
      spend: item.spend,
      cpm: item.cpm,
      cpc: item.cpc,
      ctr: item.ctr,
      frequency: item.frequency,
      conversions: item.conversions,
      date_start: item.date_start,
      date_stop: item.date_stop,

      // เพิ่มฟิลด์ที่ต้องการดึง
      //campaign_name,adset_name,ad_name,reach, impressions,clicks,  cpm,cpc,ctr,frequency,actions, conversions,   spend
    }));
}

async function listAdset(startDate, endDate, status) {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v20.0/${adAccountId}/insights`,
      {
        params: {
          access_token: accessToken,
          fields: fb_fields,
          level: "ad",
          time_range: JSON.stringify({ since: startDate, until: endDate }),
          filtering: JSON.stringify([
            { field: "ad.effective_status", operator: "IN", value: [status] },
          ]),
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Error fetching ad insights:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function getAdInsights(startDate, endDate, status) {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v20.0/${adAccountId}/insights`,
      {
        params: {
          access_token: accessToken,
          fields: fb_fields,
          level: "ad",
          time_range: JSON.stringify({ since: startDate, until: endDate }),
          filtering: JSON.stringify([
            { field: "ad.effective_status", operator: "IN", value: [status] },
          ]), // กรองสถานะโฆษณาที่เป็น ACTIVE
          // filtering: JSON.stringify([
          //   { field: "effective_status", operator: "IN", value: ["ACTIVE"] },
          // ]), // กรองสถานะโฆษณาที่เป็น ACTIVE
        },
      }
    );
    // console.log("response.data ", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error fetching ad insights:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function getDailyAdInsights(startDate, endDate, status) {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v20.0/${adAccountId}/insights`,
      {
        params: {
          access_token: accessToken,
          fields: fb_fields,
          level: "ad",
          time_range: JSON.stringify({ since: startDate, until: endDate }),
          time_increment: 1, // ดึงข้อมูลรายวัน
          filtering: JSON.stringify([
            { field: "ad.effective_status", operator: "IN", value: [status] },
          ]), // กรองตามสถานะ
        },
      }
    );
    // console.log("response.data ", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error fetching ad insights:",
      error.response.data.error.message
    );
  }
}

app.get("/", (req, res) => {
  res.send("WELCOME");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// STATUS
// ACTIVE: โฆษณาที่กำลังทำงานและแสดงผลอยู่
// PAUSED: โฆษณาที่ถูกหยุดชั่วคราว
// ARCHIVED: โฆษณาที่ถูกเก็บรักษาไว้ แต่ไม่สามารถแสดงผลได้
// DELETED: โฆษณาที่ถูกลบออกจากระบบ
