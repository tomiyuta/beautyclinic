"use client";

import { useState } from "react";
import TextField from "@atlaskit/textfield";
import Textarea from "@atlaskit/textarea";
import Select from "@atlaskit/select";
import Checkbox from "@atlaskit/checkbox";
import Tag from "@atlaskit/tag";
import Button from "@atlaskit/button";
import type { ContentGenerationFormState } from "../hooks/useContentGenerationFormState";
import {
  videoContentTypeOptions,
  videoDurationOptions,
  videoAspectRatioOptions,
  videoStyleOptions,
  videoLanguageOptions,
  videoBackgroundOptions,
} from "../constants/content-type-options";

interface VideoContentFormProps {
  formState: ContentGenerationFormState;
  contentType: string;
  onContentTypeChange: (type: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  isPending: boolean;
}

export function VideoContentForm({
  formState,
  contentType,
  onContentTypeChange,
  onSubmit,
  isPending,
}: VideoContentFormProps) {
  const { campaign, video } = formState;
  const [textOverlayInput, setTextOverlayInput] = useState("");

  const videoOption = videoContentTypeOptions.find((opt) => opt.value === contentType);
  const isShortVideo = videoOption?.type === "short";
  const isExplanationVideo = videoOption?.type === "explanation";

  const handleAddTextOverlay = () => {
    if (textOverlayInput.trim() && !video.textOverlay.includes(textOverlayInput.trim())) {
      video.setTextOverlay([...video.textOverlay, textOverlayInput.trim()]);
      setTextOverlayInput("");
    }
  };

  const handleRemoveTextOverlay = (text: string) => {
    video.setTextOverlay(video.textOverlay.filter((t) => t !== text));
  };

  return (
    <>
      {/* コンテンツタイプ選択 */}
      <div>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontSize: "14px",
            fontWeight: 500,
            color: "#42526E",
          }}
        >
          動画タイプ *
        </label>
        <Select
          options={videoContentTypeOptions}
          value={videoContentTypeOptions.find((opt) => opt.value === contentType) || null}
          onChange={(option) =>
            onContentTypeChange((option?.value as string | undefined) || "")
          }
          placeholder="タイプを選択してください"
          isRequired
        />
      </div>

      {/* キャンペーン情報 */}
      <div>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontSize: "14px",
            fontWeight: 500,
            color: "#42526E",
          }}
        >
          キャンペーン名 *
        </label>
        <TextField
          value={campaign.campaignTitle}
          onChange={(e) => campaign.setCampaignTitle((e.target as HTMLInputElement).value)}
          placeholder="例: 12月年末特化キャンペーン"
          isRequired
        />
      </div>

      <div>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontSize: "14px",
            fontWeight: 500,
            color: "#42526E",
          }}
        >
          キャンペーン説明 *
        </label>
        <Textarea
          value={campaign.campaignDescription}
          onChange={(e) =>
            campaign.setCampaignDescription((e.target as HTMLTextAreaElement).value)
          }
          placeholder="動画生成のための説明を入力してください（300文字以内）"
          minimumRows={3}
          isRequired
          maxLength={300}
        />
      </div>

      {/* 短尺動画のオプション */}
      {isShortVideo && (
        <>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#42526E",
              }}
            >
              動画の長さ
            </label>
            <Select
              options={videoDurationOptions}
              value={videoDurationOptions.find((opt) => opt.value === video.videoDuration) || null}
              onChange={(option) =>
                video.setVideoDuration(
                  (option?.value as 5 | 10 | 15) || 10
                )
              }
              defaultValue={videoDurationOptions.find((opt) => opt.value === 10) || null}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#42526E",
              }}
            >
              アスペクト比
            </label>
            <Select
              options={videoAspectRatioOptions}
              value={videoAspectRatioOptions.find((opt) => opt.value === video.videoAspectRatio) || null}
              onChange={(option) =>
                video.setVideoAspectRatio(
                  (option?.value as "9:16" | "16:9" | "1:1" | "4:5" | "5:4" | "3:2" | "2:3") || "9:16"
                )
              }
              defaultValue={videoAspectRatioOptions.find((opt) => opt.value === "9:16") || null}
            />
          </div>

          <div>
            <Checkbox
              label="BGMを有効にする"
              isChecked={video.bgmEnabled}
              onChange={(e) =>
                video.setBgmEnabled((e.target as HTMLInputElement).checked)
              }
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#42526E",
              }}
            >
              テキストオーバーレイ
            </label>
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <TextField
                value={textOverlayInput}
                onChange={(e) => setTextOverlayInput((e.target as HTMLInputElement).value)}
                placeholder="テキストを入力"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTextOverlay();
                  }
                }}
              />
              <Button onClick={handleAddTextOverlay}>追加</Button>
            </div>
            {video.textOverlay.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {video.textOverlay.map((text, index) => (
                  <Tag
                    key={index}
                    text={text}
                    removeButtonLabel={`${text}を削除`}
                    onAfterRemoveAction={() => {
                      handleRemoveTextOverlay(text);
                      return "Post Removal Hook";
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#42526E",
              }}
            >
              動画スタイル
            </label>
            <Select
              options={videoStyleOptions}
              value={videoStyleOptions.find((opt) => opt.value === video.videoStyle) || null}
              onChange={(option) =>
                video.setVideoStyle(
                  (option?.value as "realistic" | "animation" | "slideshow") || "realistic"
                )
              }
              defaultValue={videoStyleOptions.find((opt) => opt.value === "realistic") || null}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#42526E",
              }}
            >
              生成数
            </label>
            <TextField
              type="number"
              value={video.videoCount.toString()}
              onChange={(e) => {
                const val = parseInt((e.target as HTMLInputElement).value, 10);
                video.setVideoCount(isNaN(val) ? 2 : Math.min(Math.max(val, 1), 2));
              }}
              min={1}
              max={2}
            />
          </div>
        </>
      )}

      {/* 施術説明動画のオプション */}
      {isExplanationVideo && (
        <>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#42526E",
              }}
            >
              施術名 *
            </label>
            <TextField
              value={video.treatmentName}
              onChange={(e) => video.setTreatmentName((e.target as HTMLInputElement).value)}
              placeholder="例: ダーマペン"
              isRequired
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#42526E",
              }}
            >
              スクリプト *
            </label>
            <Textarea
              value={video.videoScript}
              onChange={(e) => video.setVideoScript((e.target as HTMLTextAreaElement).value)}
              placeholder="動画の台本を入力してください（1000文字以内）"
              minimumRows={6}
              isRequired
              maxLength={1000}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#42526E",
              }}
            >
              アバターID
            </label>
            <TextField
              value={video.avatarId}
              onChange={(e) => video.setAvatarId((e.target as HTMLInputElement).value)}
              placeholder="SynthesiaアバターID（オプション）"
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#42526E",
              }}
            >
              言語
            </label>
            <Select
              options={videoLanguageOptions}
              value={videoLanguageOptions.find((opt) => opt.value === video.videoLanguage) || null}
              onChange={(option) =>
                video.setVideoLanguage(
                  (option?.value as "ja" | "en" | "zh" | "ko") || "ja"
                )
              }
              defaultValue={videoLanguageOptions.find((opt) => opt.value === "ja") || null}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#42526E",
              }}
            >
              背景
            </label>
            <Select
              options={videoBackgroundOptions}
              value={videoBackgroundOptions.find((opt) => opt.value === video.videoBackground) || null}
              onChange={(option) =>
                video.setVideoBackground(
                  (option?.value as "clinic" | "simple") || "simple"
                )
              }
              defaultValue={videoBackgroundOptions.find((opt) => opt.value === "simple") || null}
            />
          </div>
        </>
      )}

      {/* ボタンはメインフォームで表示されるため、ここでは削除 */}
    </>
  );
}

