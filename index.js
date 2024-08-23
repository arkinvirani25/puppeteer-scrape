const express = require("express");
const app = express();
const puppeteer = require("puppeteer");
require("dotenv").config();

app.get("/scrap/:url", async (req, res) => {
  console.log("params => ", req.params);
  const url = req.params.url;
  console.log("url => ", url);
  try {
    if (!url) {
      return res.send({ message: "URL is required" }).status(400);
    }
    const browser = await puppeteer.launch({
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
      ],
      executablePath:
        process.env.NODE_ENV === "production"
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
    });
    // const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: "domcontentloaded",
    });

    const roomDetails = [];
    const roomElementsSelector = ".dba1b3bddf.d371fb5186.b72e42bcff";

    await page.waitForSelector(roomElementsSelector);

    const tempRoomElements = await page.$$(roomElementsSelector);
    const roomElements = [...tempRoomElements];
    console.log(`Found ${roomElements.length} room elements.`);

    for (let index = 0; index < roomElements.length; index++) {
      // const newPage = await browser.newPage();
      // await newPage.goto(url, {
      //   waitUntil: "domcontentloaded",
      // });
      // const roomElements = await newPage.$$(roomElementsSelector);
      const roomElement = roomElements[index];
      console.log("index => ",index);
      
      console.log("roomElement => ", roomElement.textContent());

      if (!roomElement) continue;

      try {
        await roomElement.evaluate((el) => el.scrollIntoView());
        await roomElement.click();
        await page.waitForSelector(".rt-lightbox-title");

        console.log("title class got =================> ");

        const room = await page.evaluate(() => {
          let roomData = { name: "", description: "" };
          //for scrapping title
          const titleElement = document.querySelector(".rt-lightbox-title");
          roomData["name"] = titleElement
            ? titleElement.innerHTML
            : "No data found";

          //for scrapping description and size
          const rightContainerElement = document.querySelector(
            ".hprt-lightbox-right-container"
          );
          const segment = rightContainerElement
            ? rightContainerElement.innerHTML
            : null;
          const f_filter = segment && segment.split("roomsize")[1];
          const s_filter =
            f_filter && f_filter.split("more-facilities-space")[0];

          roomData["description"] = s_filter || "";
          return roomData;
        });

        console.log("title got =================> ");

        const facilities = await page.$$eval(".bui-badge", (elements) =>
          elements.map((el) => el?.textContent?.trim())
        );

        console.log("facilities got =================> ");

        const otherFacilities = await page.$$eval(
          ".hprt-lightbox-list__item.js-lightbox-facility",
          (elements) => elements.map((el) => el?.textContent?.trim())
        );

        console.log("otherFacilities got =================> ");

        const imageURLs = await page.$$eval(
          ".js-hotel-thumb.hotel_thumbs_sprite.change_large_image_on_hover",
          (elements) =>
            elements.map((el) => el?.children[0]?.attributes[0]?.nodeValue)
        );

        console.log("imageURLs got =================> ");

        const description_n_size = "";
        //   room?.description && (await getRoomDescription(room?.description));

        await page.keyboard.press("Escape");
        roomDetails.push({
          ...room,
          description:
            (description_n_size &&
              JSON.parse(description_n_size).description) ||
            "",
          size:
            (description_n_size && JSON.parse(description_n_size).size) || "",
          facilities: [...facilities, ...otherFacilities] || [],
          imageURLs: imageURLs || [],
        });

        // await newPage.evaluate(() => {
        //   return new Promise((resolve) => {
        //     setTimeout(resolve, 4000);
        //   });
        // });
        // await newPage.close();
      } catch (error) {
        console.log(
          `An error occurred for room index ${index}: ${error.message}`
        );
        continue;
      }
    }

    await browser.close();

    return res
      .send({
        data: roomDetails,
        message: "Hotel found successfully",
      })
      .status(200);
  } catch (error) {
    return res.send({ error: error.message }).status(500);
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Listening on port ${process.env.PORT}`);
});
